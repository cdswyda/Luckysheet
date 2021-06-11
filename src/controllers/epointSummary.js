// import { modelHTML } from './constant';
// import { replaceHtml, transformRangeToAbsolute, openSelfModel } from '../utils/util';
import luckysheetsizeauto from './resize';
import dataVerificationCtrl from './dataVerificationCtrl';
import { selectionCopyShow } from './select';
import { setRangeShow } from '../global/api';
import Store from '../store';
import { getRangetxt, getSheetIndex } from '../methods/get';
import tooltip from '../global/tooltip';
import eventEmitter from '../utils/event';
import { debounce } from '../utils/util';

const DIALOG_ID = 'luckysheet-epoint-summary-dialog';

const TYPE2TEXT = {
    row: '逐行汇总',
    count: '计数',
    cum: '求和',
    avg: '求平均',
    max: '取最大',
    min: '取最小'
};

/**
 * 判断矩形区域是否有相交的部分
 * https://www.cnblogs.com/avril/archive/2013/04/01/2993875.html
 *
 * @param {{x:number,y:number,w:number,h:number}} rect1 第一个矩形
 * @param {{x:number,y:number,w:number,h:number}} rect2 第二个矩形
 * @returns 是否相交
 */

function rectCross(rect1, rect2) {
    var m = [Math.max(rect1.x, rect2.x), Math.max(rect1.y, rect2.y)];
    var n = [Math.min(rect1.x + rect1.w, rect2.x + rect2.w), Math.min(rect1.y + rect1.h, rect2.y + rect2.h)];

    if (m[0] <= n[0] && m[1] <= n[1]) {
        return true;
    }
    return false;
}

const CONTENT_HTML = `
<div class="epoint-summary-config">
    <div class="epoint-summary-config-block">
        <div class="epoint-summary-config-label">汇总方式</div>
        <div class="epoint-summary-config-ctr">
            <div class="epoint-radio-list">
                <span class="epoint-radio-item" data-type="row">
                    <label class="epoint-radio-label"><input type="radio" name="summary-type" class="epoint-radio-item-check"><span class="epoint-radio-item-icon"></span><span class="epoint-radio-item-text">逐行汇总</span></label>
                </span>

                <span class="epoint-radio-item" data-type="count">
                    <label class="epoint-radio-label"><input type="radio" name="summary-type" class="epoint-radio-item-check"><span class="epoint-radio-item-icon"></span><span class="epoint-radio-item-text">计数</span></label>
                </span>

                <span class="epoint-radio-item" data-type="sum">
                    <label class="epoint-radio-label"><input type="radio" name="summary-type" class="epoint-radio-item-check"><span class="epoint-radio-item-icon"></span><span class="epoint-radio-item-text">求和</span></label>
                </span>

                <span class="epoint-radio-item" data-type="avg">
                    <label class="epoint-radio-label"><input type="radio" name="summary-type" class="epoint-radio-item-check"><span class="epoint-radio-item-icon"></span><span class="epoint-radio-item-text">求平均</span></label>
                </span>

                <span class="epoint-radio-item" data-type="max">
                    <label class="epoint-radio-label"><input type="radio" name="summary-type" class="epoint-radio-item-check"><span class="epoint-radio-item-icon"></span><span class="epoint-radio-item-text">取最大</span></label>
                </span>

                <span class="epoint-radio-item" data-type="min">
                    <label class="epoint-radio-label"><input type="radio" name="summary-type" class="epoint-radio-item-check"><span class="epoint-radio-item-icon"></span><span class="epoint-radio-item-text">取最小</span></label>
                </span>
            </div>
        </div>
    </div>
    <div class="epoint-summary-config-block" id="epoint-summary-config-range-config">
        <div class="epoint-summary-config-label">应用范围</div>
        <div class="epoint-summary-config-ctr">
            <div class="epoint-sheet-range area-select"><input class="epoint-sheet-range-input" placeholder="请输入单元格范围"><i class="fa fa-table epoint-sheet-range-icon" aria-hidden="true" title="点击选择单元格范围"></i></div>
            <span class="btn btn-primary epoint-sheet-button area-add">添加</span>
        </div>
    </div>
    <div class="epoint-summary-config-block colum-layout" id="epoint-summary-config-row-config">
        <div>
            <div class="epoint-summary-config-label">起始行</div>
            <div class="epoint-summary-config-ctr">
                <div class="epoint-sheet-range"><input class="epoint-sheet-range-input" placeholder="请选择" readonly><i class="fa fa-table epoint-sheet-range-icon" aria-hidden="true" title="点击选择"></i></div>
            </div>
        </div>
        <div>
            <div class="epoint-summary-config-label">生效列</div>
            <div class="epoint-summary-config-ctr">
                <div class="epoint-sheet-range"><input class="epoint-sheet-range-input" placeholder="请选择" readonly><i class="fa fa-table epoint-sheet-range-icon" aria-hidden="true" title="点击选择"></i></div>
            </div>
        </div>
        <span class="btn btn-primary epoint-sheet-button ">添加</span>
    </div>
    <div class="epoint-summary-config-split"></div>
    <div class="epoint-summary-config-block">
        <div>所有规则</div>
        <div class="epoint-summary-config-list"></div>
    </div>
</div>
`;

function tips(content) {
    tooltip.info('<i class="fa fa-exclamation-triangle"></i>', content);
}

/**
 * 初始化汇总的右侧弹窗
 */
let isInitSummaryDialog = false;
function initRightDialog(params) {
    if (isInitSummaryDialog) {
        return;
    }

    let html = `
    <div id="${DIALOG_ID}" class="luckysheet-modal-dialog-slider" style="display:none;">
        <div class="luckysheet-modal-dialog-slider-title"> <span>汇总规则</span> <span id="${DIALOG_ID}-close" class="luckysheet-modal-dialog-slider-close" style="display:none;" title="关闭"><i class="fa fa-times" aria-hidden="true"></i></span> </div>
        <div class="luckysheet-modal-dialog-slider-content">
            ${CONTENT_HTML}
            <div class="luckysheet-modal-dialog-slider-content-cover" </div>
        </div>
    </div>
    `;
    $(document.body).append(html);

    epointSummary.$el = $('#' + DIALOG_ID);
    epointSummary.$cover = epointSummary.$el.find('.luckysheet-modal-dialog-slider-content-cover');

    // 默认选中第一个
    // epointSummary.$el
    //     .find('.epoint-radio-item-check')
    //     .eq(0)
    //     .prop('checked', true);

    initEvent();

    isInitSummaryDialog = true;
}

let typeCtr;
function initEvent() {
    epointSummary.$el
        // 关闭
        .on('click', `#${DIALOG_ID}-close`, epointSummary.closeDialog)

        // 选区按钮点击
        .on('click', '.epoint-sheet-range-icon', function() {
            var txt = $(this)
                .prev()
                .val();
            txt = $.trim(txt);

            epointSummary._showRangeSelect(txt);
        });
    // 类型变更
    const $radioList = epointSummary.$el.find('.epoint-radio-list');
    typeCtr = new TypeControl($radioList);
    typeCtr.addEventListener('change', function(e) {
        if (e.detail.value == 'row') {
            $('#epoint-summary-config-range-config').hide();
            $('#epoint-summary-config-row-config').show();
        } else {
            $('#epoint-summary-config-range-config').show();
            $('#epoint-summary-config-row-config').hide();
        }
    });
    typeCtr.setValue('row', true);

    // 添加按钮
    epointSummary.$el.on('click', '.epoint-sheet-button', function() {
        var data = epointSummary._rangeData;
        if (!data.range || !data.id) {
            // 还没通过选择确定生成选区

            // 尝试通过输入框的输入转换
            var $input = $('#epoint-summary-config-range-config .epoint-sheet-range-input');

            var txt = $.trim($input.val());
            if (!$input.is(':visible')) {
                return tips('请选择汇总范围');
            }
            var range = dataVerificationCtrl.getRangeByTxt(txt)[0];

            if (!range) {
                return tips('请输入或选择汇总范围');
            }
            data.range = range;
            data.id = data.text = getRangetxt(Store.currentSheetIndex, range);
        }

        var range = data.range;
        const type = typeCtr.getValue();
        const item = {
            id: data.id,
            type: type,
            row1: range.row[0],
            column1: range.column[0],
            column2: range.column[1]
        };
        if (item.type !== 'row') {
            item.row2 = range.row[1];
        }

        var isSuccess = epointSummary.addRule(item);
        if (!isSuccess) {
            return tips('此区域内已有汇总设置，请重新选择');
        }
        // clear
        epointSummary._rangeData = {
            id: '',
            range: null,
            text: '',
            row: '',
            column: ''
        };
        $(`#${DIALOG_ID} .epoint-sheet-range-input`).val('');
    });

    // 规则移除
    epointSummary.$el.on('click', '.epoint-summary-rule-item-remove', function() {
        var $item = $(this).closest('.epoint-summary-rule-item');
        var sheetId = $item[0].getAttribute('data-sheet');
        var id = $item[0].getAttribute('data-id');

        epointSummary.removeRule(id, sheetId, false);
        $item.remove();
    });
}

/**
 * 获取行汇总情况下的结束行位置
 * @param {number} r 开始行坐标
 * @param {number} c1 开始列坐标
 * @param {number} c2 结束列坐标
 * @param {Array<Array<object>>} data 当前sheet数据
 * @returns
 */
function getRowSummaryEnd(r, c1, c2, data) {
    let endRow = Infinity;
    for (let i = r + 1; i < data.length; i++) {
        for (let j = c1; j <= c2; j++) {
            let cell = data[i][j];
            // 单元格一旦存在值或者公司则认为到此为止
            if (cell && (cell.v || cell.m || cell.f)) {
                endRow = i - 1;
                return endRow;
            }
        }
    }
    return endRow;
}
function getRowSummaryRectHeight(r, c1, c2, data) {
    var r2 = getRowSummaryEnd(r, c1, c2, data);
    if (r2 === Infinity) {
        return Infinity;
    }
    return r2 - r;
}

class TypeControl extends EventTarget {
    constructor(el) {
        super();
        this.value = '';
        this.$el = $(el);
        this.init();
    }
    init() {
        const me = this;
        this.$el.find('.epoint-radio-item-check').on('change', function(e) {
            var type = $(this)
                .closest('.epoint-radio-item')
                .data('type');
            me.value = type;
            me._fireEvent('change', {
                value: type
            });
        });
    }

    _fireEvent(type, detail) {
        const event = new CustomEvent(type, {
            detail: detail
        });

        this.dispatchEvent(event);
    }

    getValue() {
        return this.value;
    }

    setValue(v, fireEvent) {
        var $item = this.$el.find('.epoint-radio-item[data-type="' + v + '"]');
        if ($item.length) {
            $item.find('.epoint-radio-item-check').prop('checked', true);
            this.value = v;

            if (fireEvent) {
                this._fireEvent('change', {
                    value: this.value
                });
            }
        }
    }
}

// TODO rule id问题
function getRuleRangeText(rule) {
    if (rule.type === 'row') {
        return `${rule.row1 + 1}(${rule.column1 + 1}:${rule.column2 + 1})`;
    }
    return `${rule.id}`;
}

function ruleItem(item, sheet) {
    return `
    <div class="epoint-summary-rule-item" data-id="${item.id}" data-sheet="${sheet.index}">
        <div class="epoint-summary-rule-item-desc">
            <span class="epoint-summary-rule-item-txt">${getRuleRangeText(item)}</span>
            <span class="epoint-summary-rule-item-type">${TYPE2TEXT[item.type]}</span>
        </div>
        <div class="epoint-summary-rule-item-operate"><span class="epoint-summary-rule-item-remove luckysheet-iconfont-shanchu iconfont"></span></div>
    </div>
    `;
}

function buildRuleHtml() {
    let html = '';
    // 当前的
    const file = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
    if (!file.config || !file.config.summary || !file.config.summary.length) {
        html = '';
    } else {
        html = file.config.summary.map((item) => ruleItem(item, file)).join('');
    }

    // 其他工作表的
    // Store.luckysheetfile.forEach((sheet) => {
    //     if (sheet === file) {
    //         return;
    //     }
    //     if (!sheet.config || !sheet.config.summary || !sheet.config.summary.length) {
    //         return;
    //     }
    //     sheet.config.summary.forEach((item) => {
    //         html += ruleItem(item, sheet);
    //     });
    // });

    return html;
}

const epointSummary = {
    _rangeData: {},
    closeDialog() {
        epointSummary.$el.hide();
        eventEmitter.off('rangeSelect', epointSummary._handleRangeSelet);
        eventEmitter.off('sheetActivate');

        luckysheetsizeauto();
    },
    /**
     * 显示范围选择弹窗
     * @param {string} txt 选区文本值 如A1:D4
     */
    _showRangeSelect(txt = '') {
        dataVerificationCtrl.rangeDialog('0', txt);
        epointSummary.$cover.show();

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

        // 调整关闭逻辑
        $(document)
            .off('click.epointSummary', '#luckysheet-dataVerificationRange-dialog .luckysheet-modal-dialog-title-close')
            .on(
                'click.epointSummary',
                '#luckysheet-dataVerificationRange-dialog .luckysheet-modal-dialog-title-close',
                epointSummary._hideRangeSelect
            )
            .off('click.epointSummary', '#luckysheet-dataVerificationRange-dialog-close')
            .on(
                'click.epointSummary',
                '#luckysheet-dataVerificationRange-dialog-close',
                epointSummary._hideRangeSelect
            );

        // 处理确定逻辑
        $(document)
            .off('click.epointSummary', '#luckysheet-dataVerificationRange-dialog-confirm')
            .on(
                'click.epointSummary',
                '#luckysheet-dataVerificationRange-dialog-confirm',
                epointSummary._onRangeConfirm
            );
    },
    /**
     * 隐藏范围选择弹窗
     */
    _hideRangeSelect() {
        $('#luckysheet-dataVerificationRange-dialog').hide();
        $('#luckysheet-modal-dialog-mask').hide();
        epointSummary.$cover.hide();
    },

    /**
     * 选区确定
     */
    _onRangeConfirm() {
        const data = (epointSummary._rangeData = {
            id: '',
            range: null,
            text: '',
            row: '',
            column: ''
        });
        const range = dataVerificationCtrl.selectRange[0];
        if (!range) return;

        data.range = range;
        // data.text = dataVerificationCtrl.getTxtByRange(range[0]);
        data.id = data.text = getRangetxt(Store.currentSheetIndex, data.range);
        data.row = range.row[0] + 1;
        data.column = range.column[0] + 1 + ':' + (range.column[1] + 1);

        const type = typeCtr.getValue();
        if (type === 'row') {
            var $config = $('#epoint-summary-config-row-config .epoint-sheet-range-input');
            $config.eq(0).val(data.row);
            $config.eq(1).val(data.column);
        } else {
            $('#epoint-summary-config-range-config .epoint-sheet-range-input').val(data.text);
        }

        epointSummary._hideRangeSelect();
        setRangeShow(data.range);
    },
    /**
     * 新增一个汇总规则
     * @param {*} rule
     * @param {*} sheetId
     * @returns 是否新增成功
     */
    addRule(rule, sheetId) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];
        if (!file.config) {
            file.config = {};
        }
        if (!file.config.summary) {
            file.config.summary = [];
        }

        const summary = file.config.summary;

        // 检查是否重复
        const isOccupied = summary.some((item) => {
            const rect1 = {
                x: rule.column1,
                y: rule.row1,
                w: rule.column2 - rule.column1,
                h: rule.row2 - rule.row1
            };
            const rect2 = {
                x: item.column1,
                y: item.row1,
                w: item.column2 - item.column1,
                h: item.row2 - item.row1
            };

            // 行模式下 没有高度限制
            if (rule.type === 'row') {
                // rect1.h = Infinity;
                rect1.h = getRowSummaryRectHeight(rule.row1, rule.column1, rule.column2, file.data);
            }
            if (item.type === 'row') {
                // rect2.h = Infinity;
                rect2.h = getRowSummaryRectHeight(item.row1, item.column1, item.column2, file.data);
            }

            return rectCross(rect1, rect2);
        });
        if (isOccupied) {
            return false;
        }

        summary.push(rule);
        epointSummary.refreshDialogContent();
        return true;
    },
    /**
     * 移除一个汇总规则
     * @param {*} ruleId
     * @param {*} sheetId
     * @param {*} refresh
     * @returns
     */
    removeRule(ruleId, sheetId, refresh = true) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];

        if (!file.config || !file.config.summary || !file.config.summary.length) {
            return;
        }

        const summary = file.config.summary;
        for (let i = 0; i < summary.length; i++) {
            if (ruleId === summary[i].id) {
                summary.splice(i, 1);
                break;
            }
        }
        if (refresh) {
            epointSummary.refreshDialogContent();
        }
    },

    showDialog() {
        initRightDialog();
        // 监听选区变化
        eventEmitter.on('rangeSelect', epointSummary._handleRangeSelet);
        // 监听sheet切换
        eventEmitter.on('sheetActivated', epointSummary.refreshDialogContent);
        // 隐藏其他的 右侧弹窗
        $('.luckysheet-modal-dialog-slider').hide();

        /*
        epointSummary.$el
            .off('mouseenter.epointSummary', '.epoint-summary-rule-item')
            .on('mouseenter.epointSummary', '.epoint-summary-rule-item', epointSummary._handleMouseEnter);*/
        epointSummary.refreshDialogContent();
        epointSummary.$el.show();

        luckysheetsizeauto();
    },
    /**
     * 选区变化时 将选区内容同步到输入框
     */
    _handleRangeSelet: debounce((ev) => {
        let range = JSON.parse(ev.data.range);
        if (!range || !range.length) {
            return;
        }
        range = range[0];

        // 基于选区更新当前数据和显示值
        var data = (epointSummary._rangeData = {
            id: '',
            range: null,
            text: '',
            row: '',
            column: ''
        });
        data.range = range;
        data.id = data.text = getRangetxt(Store.currentSheetIndex, data.range);
        data.row = range.row[0] + 1;
        data.column = range.column[0] + 1 + ':' + (range.column[1] + 1);
        const type = typeCtr.getValue();
        if (type === 'row') {
            var $config = $('#epoint-summary-config-row-config .epoint-sheet-range-input');
            $config.eq(0).val(data.row);
            $config.eq(1).val(data.column);
        } else {
            $('#epoint-summary-config-range-config .epoint-sheet-range-input').val(data.text);
        }
    }, 50),
    _handleMouseEnter() {
        var sheetId = this.getAttribute('data-sheet');
        if (sheetId != Store.currentSheetIndex) {
            return;
        }
        var range = this.getAttribute('data-id');

        setRangeShow(range);
    },
    refreshDialogContent() {
        if (!isInitSummaryDialog) {
            return;
        }
        var ruleHtml = buildRuleHtml();
        epointSummary.$el.find('.epoint-summary-config-list').html(ruleHtml);
    }
};

export default epointSummary;
export { epointSummary };
