import { modelHTML } from './constant';
import { replaceHtml, transformRangeToAbsolute, openSelfModel } from '../utils/util';
import Store from '../store';
import { getRangetxt, getSheetIndex } from '../methods/get';
import { jfrefreshgrid } from '../global/refresh';
import { setRangeShow } from '../global/api';
import luckysheetsizeauto from './resize';

// let isInitialProtection = false,
//     isInitialProtectionAddRang = false,
//     rangeItemListCache = [],
//     isAddRangeItemState = true,
//     updateRangeItemIndex = null,
//     validationAuthority = null,
//     updatingSheetFile = null,
//     firstInputSheetProtectionPassword = true;
// let sqrefMapCache = {},
//     inputRangeProtectionPassword = {},
//     initialRangePasswordHtml = false;

// function initEvent(file) {}

// // 初始化保护区域的内
// function initialProtectionRangeModal(file) {
//     if(isInitialProtectionAddRang){
//         return;
//     }
//     isInitialProtectionAddRang = true;
// }

function getDefaultProtected(pos, rangeText) {
    return {
        id: rangeText,
        // 保护区域的范围的 text
        text: transformRangeToAbsolute(rangeText),
        /**
         * 保护位置坐标信息
         * eg
         * $A$1       0 0 0 0
         * $A$1:$D$4  0 0 3 3
         */
        row: pos[0], // 行起始位置
        col: pos[1], // 列起始位置
        row2: pos[2], // 行结束位置
        col2: pos[3], // 列结束位置

        // 此保护区域允许的功能，用于支持如腾讯文档中会员才可使用的功能，目前暂不考虑
        allow_action: {},
        // 哪些人能编辑, 目前直接固定为 1
        // 0 仅我可以编
        // 1 具备表格管理的可以编辑
        // 2 我 + 成员列表
        policy: 1,
        // 可编辑成员列表, 可指定角色、分组或人员可编辑， 目前暂不考虑
        memlist: []
    };
}

const DIALOG_ID = 'luckysheet-epoint-protection-dialog';
let isInitialProtection = false;
function initRightDialog() {
    if (isInitialProtection) {
        return;
    }

    // let _locale = locale();
    // let local_protection = _locale.protection;

    let html = `
    <div id="${DIALOG_ID}" class="luckysheet-modal-dialog-slider" style="display:none;">
        <div class="luckysheet-modal-dialog-slider-title"> <span>已保护区域</span> <span id="luckysheet-modal-dialog-epoint-protection-close" class="luckysheet-modal-dialog-epoint-protection-close" title="关闭"><i class="fa fa-times" aria-hidden="true"></i></span> </div>
        <div class="luckysheet-modal-dialog-slider-content">
            <div class="epoint-protection-list"></div>
        </div>
    </div>
    `;
    $(document.body).append(html);

    $('#' + DIALOG_ID)
        .on('click', '.luckysheet-modal-dialog-epoint-protection-close', epointProtection.hideProtections)
        .on('click', '.epoint-protection-item-remove', handleRemove);

    isInitialProtection = true;
}

/**
 * 鼠标hover的时候高亮保护的选区
 */
function handleMouseEnter() {
    var sheetId = this.getAttribute('data-sheet');
    if (sheetId != Store.currentSheetIndex) {
        return;
    }
    var range = this.getAttribute('data-id');

    setRangeShow(range);
}

function handleRemove() {
    var $item = $(this).closest('.epoint-protection-item');
    var sheetId = $item[0].getAttribute('data-sheet');
    var range = $item[0].getAttribute('data-id');

    epointProtection.removeProtectedRange(range, sheetId);
    $item.remove();
}

function protectionItemHtml(item, sheet) {
    return `
    <div class="epoint-protection-item" data-id="${item.id}" data-sheet="${sheet.index}">
        <div class="epoint-protection-item-desc">
            <div class="epoint-protection-item-title">${item.text} - 「${sheet.name}」</div>
            <div class="epoint-protection-item-content">仅管理员可编辑</div>
        </div>
        <div class="epoint-protection-item-operate"><span class="epoint-protection-item-remove luckysheet-iconfont-shanchu iconfont"></span></div>
    </div>
    `;
}
/**
 * 构建已保护选区的html
 */
function buildProtectionsHtml() {
    let html = '';
    // 当前的
    const file = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
    if (!file.config || !file.config.protections || !file.config.protections.length) {
        html = '';
    } else {
        html = file.config.protections.map((item) => protectionItemHtml(item, file)).join('');
    }

    // 其他工作表的
    Store.luckysheetfile.forEach((sheet) => {
        if (sheet === file) {
            return;
        }
        if (!sheet.config || !sheet.config.protections || !sheet.config.protections.length) {
            return;
        }
        sheet.config.protections.forEach((item) => {
            html += protectionItemHtml(item, sheet);
        });
    });

    return html;
}

const epointProtection = {
    menuItems: [
        {
            text: '保护选定区域',
            value: 'protect',
            example: ''
        },
        { text: '查看已保护区域', value: 'viewProtections', example: '' }
    ],
    /**
     * 添加保护区域
     * @returns
     */
    addProtectedRange() {
        if (!Store.luckysheet_select_save || !Store.luckysheet_select_save.length) {
            console.error('需要选区');
            return;
        }
        if (Store.luckysheet_select_save.length > 1) {
            console.error('请只选择一个选区');
            return;
        }

        let last = Store.luckysheet_select_save[Store.luckysheet_select_save.length - 1];

        let row_index = last['row_focus'];
        if (row_index == null) {
            row_index = last['row'][0];
        }

        let col_index = last['column_focus'];
        if (col_index == null) {
            col_index = last['column'][0];
        }

        console.log(last);
        var pos = [row_index, col_index, last.row[1], last.column[1]];
        console.log(pos);

        const txt = getRangetxt(Store.currentSheetIndex, last);
        const protectionItem = getDefaultProtected(pos, txt);
        console.log(txt, protectionItem);

        const file = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
        if (!file.config) {
            file.config = {
                protections: []
            };
        } else if (!file.config.protections) {
            file.config.protections = [];
        }
        const protections = file.config.protections;

        // todo 需考虑重复添加的问题

        protections.push(protectionItem);
        jfrefreshgrid();

        // 如果是可视的 则更新一下
        if ($(`#${DIALOG_ID}`).is(':visible')) {
            epointProtection.viewProtections();
        }
    },
    /**
     * 移除一个保护区域
     * @param {string} itemId 保护区域id
     * @param {string} sheetId 工作表id
     * @returns
     */
    removeProtectedRange(itemId, sheetId) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];
        if (!file.config || !file.config.protections || !file.config.protections.length) {
            return;
        }
        const protections = file.config.protections;

        for (let i = 0; i < protections.length; i++) {
            if (itemId === protections[i].id) {
                protections.splice(i, 1);
                break;
            }
        }
        jfrefreshgrid();
        setRangeShow('A1', { show: false });
    },
    /**
     * 查看保护区域
     */
    viewProtections() {
        initRightDialog();
        const $dialog = $(`#${DIALOG_ID}`);
        let html = buildProtectionsHtml;

        $dialog.find('.epoint-protection-list').html(html);

        $dialog
            .off('mouseenter.epointProtection')
            .on('mouseenter.epointProtection', '.epoint-protection-item', handleMouseEnter);

        // todo BUG 切换sheet页后 此处显示将会有问题，需要在sheet页更新改名的情况下刷新

        $dialog.show();
        luckysheetsizeauto();
    },
    hideProtections() {
        $(`#${DIALOG_ID}`)
            .off('mouseenter.epointProtection')
            .hide();

        luckysheetsizeauto();
    },
    /**
     * 根据坐标判断是否在保护区域内
     * @param {number} r 行坐标
     * @param {number} c 列坐标
     * @param {[] | undefined} 保护区域的配置，默认值为当前激活的工作表
     */
    isInProtections(r, c, protections) {
        if (protections === undefined) {
            const file = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
            if (!file.config || !file.config.protections || !file.config.protections.length) {
                return false;
            }
            protections = file.config.protections;
        }
        return protections.some((item) => epointProtection._isInProtection(r, c, item));

        // return protections.some((item) => {
        //     if (r >= item.row && c >= item.col && r <= item.row2 && c <= item.col2) {
        //         return true;
        //     }
        //     return false;
        // });
    },
    /**
     * 单元格是否在保护区域内
     * @param {number} r 行坐标
     * @param {number} c 列坐标
     * @param {object} protection 单个保护配置
     * @returns {boolean}
     */
    _isInProtection(r, c, protection) {
        if (r >= protection.row && c >= protection.col && r <= protection.row2 && c <= protection.col2) {
            return true;
        }
        return false;
    },
    /**
     *
     * @param {*} row
     * @param {*} col
     * @param {*} sheetId
     * @returns
     */
    checkAllowEdit(row, col, sheetId) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];
        if (!file.config || !file.config.protections || !file.config.protections.length) {
            return true;
        }
        const protections = file.config.protections;

        let allowEdit = true;

        // 是否在保护区域内 + 是否具备编辑权限
        for (let protection of protections) {
            const inRange = epointProtection._isInProtection(row, col, protection);
            if (inRange && !epointProtection._checkUserRight(row, col, protection)) {
                allowEdit = false;
                break;
            }
        }

        return allowEdit;
    },
    // 检查用户是否具备权限
    _checkUserRight(r, c, protection) {
        // 依赖外部实现， 无实现则直接为true
        if (window.EpointSheetDesigner && window.EpointSheetDesigner.eventHandle) {
            let checkUserRight = window.EpointSheetDesigner.eventHandle.checkUserRight;
            if (typeof checkUserRight === 'function' && !checkUserRight(r, c, protection)) {
                return false;
            }
        }

        return true;
    }
};

export default epointProtection;
