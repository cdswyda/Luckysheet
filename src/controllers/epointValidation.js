/*
 * @Description: 公式验证
 * @Author: chends
 * @Date: 2021-06-21 10:51:19
 * @Last Modified by: chends
 * @Last Modified time: 2021-06-28 09:54:06
 */
import Store from '../store';
import dataVerificationCtrl from './dataVerificationCtrl';
import {
    checkProtectionLockedRangeList,
    checkProtectionAllSelected,
    checkProtectionSelectLockedOrUnLockedCells,
    checkProtectionNotEnable,
    checkProtectionAuthorityNormal
} from './protection';

import epointValidationFn from './epointValidationFn';
import epointValidationView from './epointValidationView';

function isAllowEdit() {
    if (!checkProtectionNotEnable(Store.currentSheetIndex)) {
        return false;
    }

    if (Store.luckysheet_select_save == null || Store.luckysheet_select_save.length == 0) {
        return false;
    }
    return true;
}

function handleDataValidation() {
    if (!isAllowEdit()) {
        return;
    }

    dataVerificationCtrl.createDialog();
    dataVerificationCtrl.init();
}

const epointValidation = {
    menuItems: [
        {
            text: '数据格式校验',
            value: 'data-validation',
            example: ''
        },
        {
            text: '数据公式校验',
            value: 'data-formula-validation',
            example: ''
        },
        {
            text: '高级公式校验',
            value: 'advanced-formula-validation',
            example: ''
        },
        { text: '', value: 'split', example: '' },
        { text: '查看所有校验', value: 'view-validations', example: '' }
    ],
    handle(key) {
        console.log(key);
        if (key === 'data-validation') {
            return handleDataValidation();
        }
        if (key === 'data-formula-validation') {
            return epointValidationFn.show();
        }
        if (key === 'view-validations') {
            return epointValidationView.show();
        }
    }
};

export { epointValidation };
export default epointValidation;
