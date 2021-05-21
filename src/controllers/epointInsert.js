import Store from '../store';
import luckysheetPostil from './postil';
import hyperlinkCtrl from './hyperlinkCtrl';
import dataVerificationCtrl from './dataVerificationCtrl';
import { createLuckyChart, hideAllNeedRangeShow } from '../expendPlugins/chart/plugin';
import { getSheetIndex, getRangetxt } from '../methods/get';
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

function isAllowEdit() {
    if (!checkProtectionNotEnable(Store.currentSheetIndex)) {
        return false;
    }

    if (Store.luckysheet_select_save == null || Store.luckysheet_select_save.length == 0) {
        return false;
    }
    return true;
}

function insertHandle(key) {
    if (!isAllowEdit()) {
        return;
    }

    dataVerificationCtrl.createDialog();
    dataVerificationCtrl.init();

    // 单选多选
    if (key === 'dropdown-radio' || key === 'dropdown-check') {
        $('#data-verification-type-select')
            .val('dropdown')
            .trigger('change');

        $('#data-verification-multi').prop('checked', key === 'dropdown-check');
    }

    // 复选
    if (key === 'checkbox') {
        $('#data-verification-type-select')
            .val('checkbox')
            .trigger('change');
    }

    // 文本
    if (key === 'text') {
        $('#data-verification-type-select')
            .val('text_length')
            .trigger('change');
    }

    // 数值
    if (key === 'number') {
        $('#data-verification-type-select')
            .val('number_integer')
            .trigger('change');
    }

    // 日期
    if (key === 'date') {
        $('#data-verification-type-select')
            .val('date')
            .trigger('change');
    }

    // 身份证
    if (key === 'idcard') {
        $('#data-verification-type-select')
            .val('validity')
            .trigger('change');
        $('data-verification-validity-select')
            .val('card')
            .trigger('change');
    }
    // 手机号
    if (key === 'phone') {
        $('#data-verification-type-select')
            .val('validity')
            .trigger('change');
        $('data-verification-validity-select')
            .val('phone')
            .trigger('change');
    }

    // const range = Store.luckysheet_select_save[Store.luckysheet_select_save.length - 1];
    // const rangeText = getRangetxt(Store.currentSheetIndex, range, Store.currentSheetIndex);
    // if (window.EpointSheetDesigner && window.EpointSheetDesigner.eventHandle) {
    //     const show = window.EpointSheetDesigner.eventHandle[key];
    //     if (typeof show === 'function') {
    //         show(range, rangeText);
    //     }
    // }
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
    'dropdown-radio': insertHandle,
    'dropdown-check': insertHandle,
    checkbox: insertHandle,
    text: insertHandle,
    number: insertHandle,
    date: insertHandle,
    idcard: insertHandle,
    phone: insertHandle,

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
        // const args = [].slice.call(arguments, 1);
        if (typeof handlers[itemValue] === 'function') {
            handlers[itemValue].apply(handlers, arguments);
        }
    }
};

export default epointInsert;
