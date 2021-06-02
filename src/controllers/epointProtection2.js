import { replaceHtml, transformRangeToAbsolute, openSelfModel } from '../utils/util';
import Store from '../store';
import { getRangetxt, getSheetIndex } from '../methods/get';
import { jfrefreshgrid } from '../global/refresh';
import { setRangeShow, setCellValue } from '../global/api';

function traverseArea(range, data, handle) {
    for (let r = range.row[0]; r <= range.row[1]; r++) {
        for (let c = range.column[0]; c <= range.column[1]; c++) {
            var cell = data[r][c];
            handle(r, c, cell);
            // if (cell == null) {
            //     cell = {};
            // }
            // if (!cell.epoint) {
            //     cell.epoint = {
            //         required: true
            //     };
            // } else {
            //     cell.epoint.required = true;
            // }
            // epointSheet.sheet.setCellValue(r, c, cell, { isRefresh: true });
        }
    }
}

function getFillStyle() {
    const c = document.createElement('canvas');
    const size = 30;
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#eaeaea';
    ctx.lineCap = 'square';
    ctx.moveTo(size, 0);
    ctx.lineTo(0, size);

    ctx.moveTo(size / 2, 0);
    ctx.lineTo(0, size / 2);

    ctx.moveTo(size / 2, size);
    ctx.lineTo(size, size / 2);

    ctx.stroke();

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 0);
    ctx.moveTo(size, size);
    ctx.lineTo(size, size);

    ctx.stroke();
    // console.log(c.toDataURL());

    var c2 = document.createElement('canvas');
    c2.width = size / 2;
    c2.height = size / 2;
    var ctx2 = c2.getContext('2d');
    ctx2.drawImage(c, 0, 0, size / 2, size / 2);

    // console.log(c2.toDataURL());
    // return c2;

    return ctx2.createPattern(c2, 'repeat');
}

const epointProtection2 = {
    menuItems: [
        {
            text: '保护选定区域',
            value: 'protect',
            example: ''
        },
        { text: '取消选定区域保护', value: 'cancel-protect', example: '' }
    ],
    addProtections() {
        if (!Store.luckysheet_select_save || !Store.luckysheet_select_save.length) {
            console.error('需要选区');
            return;
        }

        const areas = Store.luckysheet_select_save;
        const data = Store.flowdata;

        areas.forEach((area) => {
            console.log(area);
            traverseArea(area, data, (r, c, cell) => {
                if (cell == null) {
                    cell = {};
                }
                if (!cell.epoint) {
                    cell.epoint = {
                        protected: 1
                    };
                } else {
                    cell.epoint.protected = 1;
                }
                setCellValue(r, c, cell);
            });
        });

        jfrefreshgrid();
    },
    removeProtections() {
        if (!Store.luckysheet_select_save || !Store.luckysheet_select_save.length) {
            console.error('需要选区');
            return;
        }

        const areas = Store.luckysheet_select_save;
        const data = Store.flowdata;

        let needRefresh = false;

        areas.forEach((area) => {
            console.log(area);
            traverseArea(area, data, (r, c, cell) => {
                if (cell == null || !cell.epoint) {
                    return;
                }
                cell.epoint.protected = 0;
                needRefresh = true;
                setCellValue(r, c, cell);
            });
        });

        needRefresh && jfrefreshgrid();
    },
    /**
     * 根据坐标判断是否是保护区域
     * @param {number} r 行坐标
     * @param {number} c 列坐标
     */
    isInProtections(r, c) {
        const data = Store.flowdata;
        const cell = data[r][c];
        return cell && cell.epoint && cell.epoint.protected;
    },
    /**
     * 检查指定行列是否可编辑
     * @param {number} r 行坐标
     * @param {number} c 列坐标
     * @param {string | number | undefined} sheetId sheet的index
     * @returns {boolean}  是否可编辑
     */
    checkAllowEdit(r, c, sheetId) {
        if (sheetId == undefined) {
            sheetId = Store.currentSheetIndex;
        }
        const file = Store.luckysheetfile[getSheetIndex(sheetId)];
        const cell = file.data[r][c];
        // 单元格不是保护的 直接就是可编辑的
        if (cell == null || !cell.epoint || !cell.epoint.protected) {
            return true;
        }

        // 单元格被保护的情况下 检查是否具备编辑权限
        return epointProtection2._checkUserRight(r, c);
    },
    // 检查用户是否具备权限
    _checkUserRight(r, c) {
        // 依赖外部实现， 无实现则直接为true
        if (window.EpointSheetDesigner && window.EpointSheetDesigner.eventHandle) {
            let checkUserRight = window.EpointSheetDesigner.eventHandle.checkUserRight2;
            if (typeof checkUserRight === 'function' && !checkUserRight(r, c)) {
                return false;
            }
        }

        return true;
    },

    fillStyle: getFillStyle()
};

export default epointProtection2;
