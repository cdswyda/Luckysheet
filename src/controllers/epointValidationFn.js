import { replaceHtml } from '../utils/util';
import { modelHTML } from './constant';
import locale from '../locale/locale';
import Store from '../store';
import { getRangetxt, getSheetIndex } from '../methods/get';
import { selectionCopyShow } from './select';
import { setRangeShow } from '../global/api';
import dataVerificationCtrl from './dataVerificationCtrl';
import tooltip from '../global/tooltip';
import eventEmitter from '../utils/event';

function tips(content) {
    tooltip.info('<i class="fa fa-exclamation-triangle"></i>', content);
}

function uid() {
    // 时间戳
    var d = +new Date();
    // 随机数 * 1000000000 用于替换 时间戳前面固定的部分
    var r = ((Math.random() * 10000) >>> 0) * 1000000000;
    // toString 32 转化为长度较短的字符串
    const id = (r + d).toString(32);
    // 如果存在了 就重新生成一次
    if (uid._store[id]) {
        console.log('id duplicated, retry!', id);
        return uid();
    }
    uid._store[id] = true;
    return id;
}
// 缓存所有生成过的id
uid._store = {};

const CONDITION_MAP = {
    lessequal: '≤',
    less: '<',
    equal: '=',
    great: '>',
    greatequal: '≥'
};

const FUN_ARR = [
    ['SUM', '求和'],
    ['AVERAGE', '平均'],
    ['MAX', '最大'],
    ['MIN', '最小'],
    ['COUNT', '计数']
];

const FUN_MAP = FUN_ARR.reduce((t, c) => {
    t[c[0]] = c[1];
    return t;
}, {});

const DIALOG_ID = 'epoint-validation-fn-dialog';
function initDialog(me) {
    me._isInit = true;

    const _locale = locale();
    const dvText = _locale.dataVerification;
    const buttonText = _locale.button;

    const fnOptions = FUN_ARR.map((item) => {
        return `<option value="${item[0]}">${item[1]}</option>`;
    }).join('');

    var buttonHtml = `
    <button id="${DIALOG_ID}-confirm" class="btn btn-primary">${buttonText.confirm}</button>
    <button class="btn btn-default luckysheet-model-close-btn">${buttonText.cancel}</button>
    `;
    const contentHtml = `
<div class="epoint-validation-fn-dialog-content">
    <div class="epoint-vfn-view">
        <div class="epoint-vfn-view-txt"></div>
    </div>
    <div class="epoint-vfn-form">
        <!-- 来源 -->
        <div class="epoint-form-item">
            <label class="epoint-form-label required">数据来源：</label>
            <div class="epoint-sheet-range epoint-vfn-source-range"><input class="epoint-sheet-range-input" readonly id="epoint-vfn-source-range" placeholder="请输入单元格范围"><i class="fa fa-table epoint-sheet-range-icon" aria-hidden="true" title="点击选择单元格范围"></i></div>
        </div>
        <div class="epoint-form-item">
            <select is="ui-select" class="epoint-vfn-source-fn" style="width: 100%;" id="epoint-vfn-source-fn">
                ${fnOptions}
            </select>
        </div>
        <!-- 比较目标 -->
        <div class="epoint-form-item">
            <label class="epoint-form-label required">校验规则：</label>
            <select is="ui-select" class="epoint-vfn-condition" style="width: 100%;" id="epoint-vfn-condition">
                <option value="lessequal">小于等于</option>
                <option value="less">小于</option>
                <option value="equal" selected>等于</option>
                <option value="great">大于</option>
                <option value="greatequal">大于等于</option>
            </select>
        </div>

        <div class="epoint-form-item">
            <div class="epoint-sheet-range epoint-vfn-target-range"><input class="epoint-sheet-range-input" id="epoint-vfn-target-range" placeholder="请输入静态值或选择单元格范围"><i class="fa fa-table epoint-sheet-range-icon" aria-hidden="true" title="点击选择单元格范围"></i></div>
        </div>

        <div class="epoint-form-item">
            <select is="ui-select" class="epoint-vfn-target-fn" style="width: 100%;"  id="epoint-vfn-target-fn">
                ${fnOptions}
            </select>
        </div>

    </div>
</div>
    `;
    $(document.body).append(
        replaceHtml(modelHTML, {
            id: DIALOG_ID,
            addclass: 'epoint-validation-fn-dialog',
            title: '公式验证',
            content: contentHtml,
            botton: buttonHtml,
            style: ''
        })
    );
    let $dialog = $(`#${DIALOG_ID}`);
    $dialog.find('.luckysheet-modal-dialog-content').css('min-width', 350);
    let myh = $dialog.outerHeight(),
        myw = $dialog.outerWidth();
    let winw = $(window).width(),
        winh = $(window).height();
    let scrollLeft = $(document).scrollLeft(),
        scrollTop = $(document).scrollTop();
    $dialog
        .css({
            left: (winw + scrollLeft - myw) / 2,
            top: (winh + scrollTop - myh) / 3
        })
        .show();
    me.$dialog = $dialog;
    bindEvent(me);
}
function bindEvent(me) {
    // 按钮
    me.$btnOk = me.$dialog.find(`#${DIALOG_ID}-confirm`).on('click', function() {
        me._onValidateConfirm();
    });

    // 视图区域
    me.$view = me.$dialog.find('.epoint-vfn-view-txt');
    // 数据来源
    me.$sourceRange = $('#epoint-vfn-source-range');

    const $sourceRangeItem = me.$sourceRange.closest('.epoint-form-item');

    $sourceRangeItem.on('click', function() {
        var txt = $.trim(me.$sourceRange.val());
        me._showRangeSelect(txt, 'Source');
    });
    me.$sourceRange.on('change', function() {
        console.log('change');
        me.makeViewText();
    });

    // 数据来源计算公式
    me.$sourceFn = $('#epoint-vfn-source-fn');
    me.$sourceFn.on('change', function() {
        me._currentData.sourceFn = this.value;
        me.makeViewText();
    });
    // 校验规则条件
    me.$condition = $('#epoint-vfn-condition');
    me.$condition.on('change', function() {
        me._currentData.condition = this.value;
        me.makeViewText();
    });

    // 目标区域
    me.$targetRange = $('#epoint-vfn-target-range');

    const $targetRangeItem = me.$targetRange.closest('.epoint-form-item');
    $targetRangeItem.on('click', '.epoint-sheet-range-icon', function() {
        var txt = $.trim(me.$targetRange.val());
        me._showRangeSelect(txt, 'Target');
    });

    // 目标计算公式
    me.$targetFn = $('#epoint-vfn-target-fn');
    me.$targetFn.on('change', function() {
        me._currentData.targetFn = this.value;
        me.makeViewText();
    });

    const $targetFnItem = me.$targetFn.closest('.epoint-form-item');

    // 目标区域变化的情况下 动态调整目标公式显示隐藏
    me.$targetRange.on('change', function() {
        let value = this.value.trim();
        const number = Number(value);
        // 静态值的话无需目标公式
        if (value && !isNaN(number)) {
            me._currentData.targetType = 'number';
            me._currentData.target = number;
            $targetFnItem.hide();
        } else {
            me._currentData.targetType = 'range';
            me._currentData.target = value;
            $targetFnItem.show();
        }

        me.makeViewText();
    });
}

function makeDefaultData() {
    return {
        // 数据来源部分
        sourceRange: null, // 区域对象
        sourceText: '', // 区域文字显示u
        sourceFn: 'SUM', // 公式

        condition: 'equal', // 比较条件

        targetType: '',
        target: '', // 目标 可能是选区或者 静态值
        targetFn: 'SUM' // 目标计算方法
    };
}
const epointValidationFn = {
    _isInit: false,
    createDialog() {
        if (!this._isInit) {
            initDialog(this);
        }
    },
    /**
     * 显示范围选择弹窗
     * @param {string} txt 选区文本值 如A1:D4
     * @param {'Source'| 'Target'} 当前确认类型
     */
    _showRangeSelect(txt = '', type = 'Source') {
        epointValidationFn.$dialog.hide();
        dataVerificationCtrl.rangeDialog('0', txt);

        dataVerificationCtrl.selectRange = [];

        // 根据输入的内容 高亮显示
        let range = dataVerificationCtrl.getRangeByTxt(txt);
        if (range.length > 0) {
            for (let s = 0; s < range.length; s++) {
                let r1 = range[s].row[0],
                    r2 = range[s].row[1];
                let c1 = range[s].column[0],
                    c2 = range[s].column[1];

                let row = Store.visibledatarow[r2],
                    row_pre = r1 - 1 == -1 ? 0 : Store.visibledatarow[r1 - 1];
                let col = Store.visibledatacolumn[c2],
                    col_pre = c1 - 1 == -1 ? 0 : Store.visibledatacolumn[c1 - 1];

                dataVerificationCtrl.selectRange.push({
                    left: col_pre,
                    width: col - col_pre - 1,
                    top: row_pre,
                    height: row - row_pre - 1,
                    left_move: col_pre,
                    width_move: col - col_pre - 1,
                    top_move: row_pre,
                    height_move: row - row_pre - 1,
                    row: [r1, r2],
                    column: [c1, c2],
                    row_focus: r1,
                    column_focus: c1
                });
            }
        }

        selectionCopyShow(dataVerificationCtrl.selectRange);
        const evNameSpace = '.epoint-vfn-dialog';
        // 调整关闭逻辑
        $(document)
            .off('click' + evNameSpace, '#luckysheet-dataVerificationRange-dialog .luckysheet-modal-dialog-title-close')
            .on(
                'click' + evNameSpace,
                '#luckysheet-dataVerificationRange-dialog .luckysheet-modal-dialog-title-close',
                epointValidationFn._hideRangeSelect
            )
            .off('click' + evNameSpace, '#luckysheet-dataVerificationRange-dialog-close')
            .on(
                'click' + evNameSpace,
                '#luckysheet-dataVerificationRange-dialog-close',
                epointValidationFn._hideRangeSelect
            );
        const confirmHandle = epointValidationFn['_on' + type + 'Confrim'];

        // 处理确定逻辑
        $(document)
            .off('click' + evNameSpace, '#luckysheet-dataVerificationRange-dialog-confirm')
            .on('click' + evNameSpace, '#luckysheet-dataVerificationRange-dialog-confirm', confirmHandle);
    },
    /**
     * 隐藏范围选择弹窗
     */
    _hideRangeSelect() {
        $('#luckysheet-dataVerificationRange-dialog').hide();
        $('#luckysheet-modal-dialog-mask').hide();
        epointValidationFn.$dialog.show();
    },
    // 选区确定
    _onRangeConfirm(type) {
        const range = dataVerificationCtrl.selectRange[0];
        console.log(range);
        const txt = getRangetxt(Store.currentSheetIndex, range);
        if (type === 'source') {
            this._currentData.sourceRange = range;
            this._currentData.sourceText = txt;
            this.$sourceRange.val(txt);
            this.$sourceRange.trigger('change');
        } else {
            this._currentData.targetType = 'range';
            this._currentData.target = txt;
            this.$targetRange.val(txt);
            this.$targetRange.trigger('change');
        }
        this._hideRangeSelect();
    },
    // 来源选区确定
    _onSourceConfrim() {
        epointValidationFn._onRangeConfirm('source');
    },
    _onTargetConfrim() {
        epointValidationFn._onRangeConfirm('target');
    },
    // 根据存储数据获取用于在右侧列表显示的数据
    getViewData(item) {
        const data = $.extend({}, item);
        let txt = '';

        txt += data.s_f;
        txt += '(' + data.s + ') ';

        txt += CONDITION_MAP[data.c];

        txt += ' ';

        if (data.t_f) {
            txt += data.t_f;
            txt += '(' + data.t + ')';
        } else {
            txt += data.t;
        }
        data.txt = txt;
        return data;
    },
    makeViewText() {
        console.log(this._currentData);
        var txt = '';

        txt += this._currentData.sourceFn;
        txt += '(' + this._currentData.sourceText + ') ';

        txt += CONDITION_MAP[this._currentData.condition];

        txt += ' ';

        const type = this._currentData.targetType;
        if (type && this._currentData.target) {
            if (type == 'number') {
                txt += this._currentData.target;
            } else {
                txt += this._currentData.targetFn;

                txt += '(' + this._currentData.target + ')';
            }
        } else {
            txt += '请配置';
        }

        this.$view.text(txt);
    },
    _currentData: makeDefaultData(),
    restoreData() {
        const data = (this._currentData = makeDefaultData());

        const range = Store.luckysheet_select_save[Store.luckysheet_select_save.length - 1];
        const rangeTxt = getRangetxt(Store.currentSheetIndex, range, Store.currentSheetIndex);

        data.sourceRange = range;
        data.sourceText = rangeTxt;

        this.$sourceRange.val(rangeTxt);
        this.$sourceFn[0].value = data.sourceFn;

        /*
        // 根据当前区域查找配置过的验证
        const item = this._getValidateConfig(id);
        if (item) {

            data.condition = item.c;

            data.target = item.t;

            if (item.t_f) {
                data.targetFn = item.t_f;
                data.targetType = 'range';
            } else {
                data.targetType = 'number';
            }
        }

        console.log(item, data); */

        this.$sourceFn[0].value = data.sourceFn;

        this.$condition[0].value = data.condition;

        this.$targetRange.val(data.target);
        this.$targetRange.trigger('change');
        this.$targetFn[0].value = data.targetFn;

        this.makeViewText();
    },
    _onValidateConfirm(sheetId) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];
        if (!file.config) {
            file.config = {};
        }
        if (!file.config.formulaValidation) {
            file.config.formulaValidation = [];
        }

        const formulaValidation = file.config.formulaValidation;

        // 组织数据格式
        const item = {
            id: '', // 标识
            s: '', // source
            s_f: '', // source_fn
            c: '', // condition
            t: '' // target
            // t_f: '' // target_fn
        };
        const data = this._currentData;

        // source 有效
        if (data.sourceRange && data.sourceText) {
            item.s = data.sourceText;
        } else {
            return tips('数据来源配置无效');
        }

        if (!data.sourceFn) {
            return tips('数据来源计算公式必填');
        } else if (!FUN_MAP[data.sourceFn]) {
            return tips('数据来源计算公式无效');
        } else {
            item.s_f = data.sourceFn;
        }

        if (!data.condition || !CONDITION_MAP[data.condition]) {
            return tips('校验规则必填');
        } else {
            item.c = data.condition;
        }
        item.id = uid();

        if (!data.targetType) {
            return tips('校验目标无效');
        }
        if (data.targetType === 'number') {
            item.t = data.target;
        } else {
            // target 为区域的情况下 需要检查是否为有效的 range
            const targetRange = dataVerificationCtrl.getRangeByTxt(data.target);

            if (!targetRange || !targetRange.length) {
                return tips('输入的目标单元格范围无效');
            } else {
                item.t = data.target;
            }

            // target 为区域时才需要公式
            if (!data.targetFn) {
                return tips('校验目标计算公式必填');
            } else if (!FUN_MAP[data.targetFn]) {
                return tips('校验目标计算公式无效');
            } else {
                item.t_f = data.targetFn;
            }
        }

        // 进行存储 之前配置过则修改 否则新增一个
        let isIn = false;
        for (let i = 0; i < formulaValidation.length; i++) {
            if (item.id === formulaValidation[i].id) {
                isIn = true;
                formulaValidation.splice(i, 1, item);
                break;
            }
        }
        if (!isIn) {
            formulaValidation.push(item);
        }
        // 派发新增事件
        eventEmitter.fire('epointValidationFn.addItem');
        this.$dialog.hide();
    },
    removeItemById(id, sheetId) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];
        if (!file.config || !file.config.formulaValidation || !file.config.formulaValidation.length) {
            return;
        }

        const formulaValidation = file.config.formulaValidation;

        for (let i = 0; i < formulaValidation.length; i++) {
            if (formulaValidation[i].id === id) {
                formulaValidation.splice(i, 1);
                break;
            }
        }
    },
    _getValidateConfig(id) {
        const file = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
        if (!file.config || !file.config.formulaValidation) {
            return null;
        }
        const formulaValidation = file.config.formulaValidation;
        for (let i = 0; i < formulaValidation.length; i++) {
            if (id === formulaValidation[i].id) {
                return formulaValidation[i];
            }
        }
        return null;
    },
    validateCellData(cellValue, item) {},
    show() {
        this.createDialog();

        this.restoreData();
        this.$dialog.show();
    }
};

export { epointValidationFn };
export default epointValidationFn;
