import { setCellValue } from '../global/api';
import { jfrefreshgrid } from '../global/refresh';
import Store from '../store';

function getRequiredFillStyle() {
    return 'rgb(255, 245, 230)';
    // return 'rgba(255, 245, 230, .5)';
}

const epointRequired = {

    fillStyle: getRequiredFillStyle(),

    /**
     * 指定单元格数据是是必填的
     * @param {*} data 单元格数据
     * @returns {Boolean}
     */
    isRequired(data) {
        return data && data.epoint && data.epoint.required;
    },

    /**
     * 设置指定 range 区域是否必填
     * @param {range |range []} rangeArr range 或  range 数组，格式：[{row:[6,6],column:[6,6]}]
     * @param {boolean} required
     * @returns
     */
    setRequiredByRange(rangeArr, required) {
        if (!rangeArr) return;
        if (!Array.isArray(rangeArr)) {
            rangeArr = [rangeArr];
        }
        required = Boolean(required) ? 1 : 0;
        const data = Store.flowdata;
        rangeArr.forEach((range) => {
            for (let r = range.row[0]; r <= range.row[1]; r++) {
                for (let c = range.column[0]; c <= range.column[1]; c++) {
                    epointRequired._setRequired(data, r, c, required);
                }
            }
        });
        jfrefreshgrid();
    },
    /**
     * 切换选中区域是否必填
     * @returns 
     */
    toggleRequired() {
        if (!Store.luckysheet_select_save || !Store.luckysheet_select_save.length) {
            console.error('需要选区');
            return;
        }
        const areas = Store.luckysheet_select_save;
        const data = Store.flowdata;

        const hasNotRequired = areas.some((range) => {
            for (let r = range.row[0]; r <= range.row[1]; r++) {
                for (let c = range.column[0]; c <= range.column[1]; c++) {
                    var cell = data[r][c];
                    if (!cell || !cell.epoint || !cell.epoint.required) {
                        return true;
                    }
                }
            }

            return false;
        });

        epointRequired.setRequired(hasNotRequired ? true : false);
    },

    /**
     * 设置当前选区是否必填
     * @param {boolean} required
     */
    setRequired(required) {
        if (!Store.luckysheet_select_save || !Store.luckysheet_select_save.length) {
            console.error('需要选区');
            return;
        }
        required = required ? 1 : 0;

        const areas = Store.luckysheet_select_save;
        const data = Store.flowdata;
        areas.forEach((range) => {
            for (let r = range.row[0]; r <= range.row[1]; r++) {
                for (let c = range.column[0]; c <= range.column[1]; c++) {
                    epointRequired._setRequired(data, r, c, required);
                }
            }
        });

        jfrefreshgrid();
    },

    cancelRequired(rangeArr) {},

    /**
     * 设置指定坐标位置是否必填
     * @param {*} data
     * @param {number} r 行
     * @param {number} c 列
     * @param {number} required 是否必填 0 1
     */
    _setRequired(data, r, c, required) {
        var cell = data[r][c];
        // 取消必填 且单元格为null时本身无须做任何处理
        if (!required && cell == null) {
            return;
        }
        if (cell == null) {
            cell = {
                epoint: {
                    required: required
                }
            };
        } else if (!cell.epoint) {
            cell.epoint = { required: required };
        } else {
            cell.epoint.required = required;
        }
        setCellValue(r, c, cell);
    }
};

export default epointRequired;
export { epointRequired };
