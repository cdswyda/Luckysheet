import Store from '../store';
import luckysheetPostil from './postil';
import hyperlinkCtrl from './hyperlinkCtrl';
import { createLuckyChart, hideAllNeedRangeShow } from '../expendPlugins/chart/plugin';
import {
    checkProtectionLockedRangeList,
    checkProtectionAllSelected,
    checkProtectionSelectLockedOrUnLockedCells,
    checkProtectionNotEnable,
    checkProtectionAuthorityNormal
} from './protection';
import pivotTable from './pivotTable';

/**
 * 插入填报说明
 */
function showFillInDescription() {
    if (window.EpointSheetDesigner && window.EpointSheetDesigner.eventHandle) {
        const show = window.EpointSheetDesigner.eventHandle.showFillInDescription;
        if (typeof show === 'function') {
            show(Store.currentSheetIndex);
        }
    }
}
/**
 * 插入图片
 * @returns
 */
function insertImage() {
    if (!checkProtectionAuthorityNormal(Store.currentSheetIndex, 'editObjects')) {
        return;
    }
    $('#luckysheet-imgUpload').click();
}
/**
 * 插入图表
 */
function insertChart() {
    createLuckyChart();
}
/**
 * 插入链接
 */
function insertLink() {
    if (!checkProtectionNotEnable(Store.currentSheetIndex)) {
        return;
    }

    if (Store.luckysheet_select_save == null || Store.luckysheet_select_save.length == 0) {
        return;
    }

    hyperlinkCtrl.createDialog();
    hyperlinkCtrl.init();
}
/**
 * 插入批注
 */
function insertPostil() {
    luckysheetPostil.removeActivePs();

    let last = Store.luckysheet_select_save[Store.luckysheet_select_save.length - 1];

    let row_index = last['row_focus'];
    if (row_index == null) {
        row_index = last['row'][0];
    }

    let col_index = last['column_focus'];
    if (col_index == null) {
        col_index = last['column'][0];
    }

    luckysheetPostil.newPs(row_index, col_index);
}

function insertPivotTable() {
    if (!checkProtectionAuthorityNormal(Store.currentSheetIndex, 'usePivotTablereports')) {
        return;
    }
    // TODO 这里需要 点击事件的事件对象 不知道有撒用 暂时传个 null
    pivotTable.createPivotTable(null);
}

const handlers = {
    // 填报说明
    'fill-in-description': showFillInDescription,
    // ======================
    image: insertImage,
    chart: insertChart,
    link: insertLink,
    // 批注
    postil: insertPostil,
    pivotTable: insertPivotTable
};

const epointInsert = {
    menuItems: [
        {
            text: '填报说明',
            value: 'fill-in-description',
            example: ''
        },
        { text: '单选', value: 'dropdown-radio', example: '' },
        { text: '多选', value: 'dropdown-check', example: '' },
        { text: '复选', value: 'checkbox', example: '' },
        { text: '文本', value: 'text', example: '' },
        { text: '数字', value: 'number', example: '' },
        { text: '日期', value: 'date', example: '' },
        { text: '其他', value: 'epoint-insert-more', example: 'more' },

        { text: '', value: 'split', example: '' },

        { text: '图片', value: 'image', example: '' },
        { text: '图表', value: 'chart', example: '' },
        { text: '链接', value: 'link', example: '' },
        { text: '批注', value: 'postil', example: '' },
        { text: '数据透视表', value: 'pivotTable', example: '' }
    ],
    otherMenuItems: [
        { text: '身份证号', value: 'idcard', example: '' },
        { text: '手机号', value: 'phone', example: '' }
    ],
    handle: function(itemValue) {
        const args = [].slice.call(arguments, 1);
        if (typeof handlers[itemValue] === 'function') {
            handlers[itemValue].apply(handlers, args);
        }
    }
};

export default epointInsert;
