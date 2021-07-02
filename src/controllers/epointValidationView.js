import luckysheetsizeauto from './resize';
import { selectionCopyShow } from './select';
import { setRangeShow } from '../global/api';
import Store from '../store';
import { getRangetxt, getSheetIndex } from '../methods/get';

import eventEmitter from '../utils/event';

import { debounce } from '../utils/util';
import epointValidationFn from './epointValidationFn';

const DIALOG_ID = 'luckysheet-epoint-validation-view-dialog';

let isInit = false;
function initRightDialog(me) {
    if (isInit) return;
    const CONTENT_HTML = `
    <div class="epoint-ctr-tabs" id="${DIALOG_ID}-content">
        <div class="epoint-ctr-tabs-header"  data-role="head">
            <div class="epoint-ctr-tabs-header-item" data-role="tab" data-target="1">格式校验</div>
            <div class="epoint-ctr-tabs-header-item" data-role="tab" data-target="2">公式校验</div>
        </div>
        <div class="epoint-ctr-tabs-body"  data-role="body" >
            <div class="epoint-ctr-tabs-body-item" data-id="1" data-role="tab-content" id="epoint-validation-view-fn-list">
            1
            </div>
            <div class="epoint-ctr-tabs-body-item" data-id="2" data-role="tab-content">
            2
            </div>
        </div>
    </div>
    `;
    let html = `
    <div id="${DIALOG_ID}" class="luckysheet-modal-dialog-slider" style="display:none;">
        <div class="luckysheet-modal-dialog-slider-title"> <span>校验规则</span> <span id="${DIALOG_ID}-close" class="luckysheet-modal-dialog-slider-close" title="关闭"><i class="fa fa-times" aria-hidden="true"></i></span> </div>
        <div class="luckysheet-modal-dialog-slider-content">
            ${CONTENT_HTML}
            <div class="luckysheet-modal-dialog-slider-content-cover"> </div>
        </div>
    </div>
    `;
    $(document.body).append(html);
    me.$el = $('#' + DIALOG_ID);
    initEvent(me);

    isInit = true;
}

function initEvent(me) {
    initTabView();

    me.$el
        // 关闭
        .on('click', `#${DIALOG_ID}-close`, () => me.closeDialog)
        // 公式验证规则移除
        .on('click', `.epoint-validation-view-fn-item-remove`, me._handleVFNRemove)
        .on('click', `.epoint-validation-view-fn-item-config`, me._handleVFNConfig);
}

function renderItem(vitem, sheet) {
    const item = epointValidationFn.getViewData(vitem);
    return `
    <div class="epoint-validation-view-fn-item" data-id="${item.id}" data-sheet="${sheet.index}" data-range="${item.s}">
        <div class="epoint-validation-view-fn-item-desc">
            <span class="epoint-validation-view-fn-item-txt">${item.txt}</span>
            <span class="epoint-validation-view-fn-item-sheet">[${sheet.name}]</span>
        </div>
        <div class="epoint-validation-view-fn-item-operate"><span class="epoint-validation-view-fn-item-config luckysheet-iconfont-shezhi iconfont"></span><span class="epoint-validation-view-fn-item-remove luckysheet-iconfont-shanchu iconfont"></span></div>
    </div>
    `;
}

function buildHtml() {
    let html = '';
    // 当前的
    const file = Store.luckysheetfile[getSheetIndex(Store.currentSheetIndex)];
    if (!file.config || !file.config.formulaValidation || !file.config.formulaValidation.length) {
        html = '';
    } else {
        html = file.config.formulaValidation.map((item) => renderItem(item, file)).join('');
    }

    // 其他工作表的
    Store.luckysheetfile.forEach((sheet) => {
        if (sheet === file) {
            return;
        }
        if (!sheet.config || !sheet.config.formulaValidation || !sheet.config.formulaValidation.length) {
            return;
        }
        sheet.config.formulaValidation.forEach((item) => {
            html += renderItem(item, sheet);
        });
    });

    return html;
}

const epointValidationView = {
    closeDialog() {
        this.$el.hide();
        luckysheetsizeauto();

        eventEmitter.off('sheetActivate');
        this._unBindShowEvent();
    },

    show() {
        initRightDialog(this);

        // 隐藏其他的 右侧弹窗
        $('.luckysheet-modal-dialog-slider').hide();

        // 监听sheet切换
        eventEmitter.on('sheetActivated', epointValidationView.refreshDialogContent);

        this._bindShowEvent();

        this.refreshDialogContent();

        this.$el.show();
        luckysheetsizeauto();
    },

    refreshDialogContent() {
        if (!isInit) {
            return;
        }
        var html = buildHtml();
        epointValidationView.$el.find('#epoint-validation-view-fn-list').html(html);
    },

    refresh() {
        this.refreshDialogContent();
    },

    // 绑定再显示时候才需要的event
    _bindShowEvent() {
        this.$el
            .off('mouseenter.epoint-validation-view', '.epoint-validation-view-fn-item')
            .on('mouseenter.epoint-validation-view', '.epoint-validation-view-fn-item', this._handleMouseEnter);

        eventEmitter.on('epointValidationFn.addItem', () => this.refreshDialogContent());
    },
    _unBindShowEvent() {
        this.$el.off('mouseenter.epoint-validation-view', '.epoint-validation-view-fn-item');

        eventEmitter.off('epointValidationFn.addItem');
    },
    _handleMouseEnter() {
        var sheetId = this.getAttribute('data-sheet');
        if (sheetId != Store.currentSheetIndex) {
            return;
        }
        var range = this.getAttribute('data-range');

        setRangeShow(range);
    },
    _handleVFNRemove() {
        var $item = $(this).closest('.epoint-validation-view-fn-item');
        var sheetId = $item[0].getAttribute('data-sheet');
        var id = $item[0].getAttribute('data-id');

        epointValidationFn.removeItemById(id, sheetId);
        $item.remove();
    },
    _handleVFNConfig() {
        var $item = $(this).closest('.epoint-validation-view-fn-item');
        var sheetId = $item[0].getAttribute('data-sheet');
        var id = $item[0].getAttribute('data-id');

        epointValidationFn.showDialogById(id, sheetId);
    }
};

export { epointValidationView };

export default epointValidationView;

function initTabView() {
    // tabview
    var defaultSettings = {
        // 默认选中的tab项，从0计数
        activeIndex: 0,
        // 容器dom对象
        dom: null,
        // 触发tab切换的事件：click|mouseover
        triggerEvent: 'click',
        // 高亮时的样式名
        activeCls: 'active',
        onchange: function(index) {}
    };

    function TabView(opts) {
        this.cfg = $.extend({}, defaultSettings, opts);

        this._initView();
        this._initEvent();
    }

    $.extend(TabView.prototype, {
        _initView: function() {
            var c = this.cfg;

            var $widget = $(c.dom),
                $widgetHd = $widget.find('> [data-role="head"]'),
                $widgetBd = $widget.find('> [data-role="body"]');

            $.extend(this, {
                $widgetHd: $widgetHd,
                $tabBody: $widgetBd
            });

            this.activeTabByIndex(c.activeIndex);
        },

        _initEvent: function() {
            var c = this.cfg,
                triggerEvent = c.triggerEvent,
                $widgetHd = this.$widgetHd,
                self = this;

            // 用于mouseover触发时的延时
            var overTimer = 0;

            if (triggerEvent == 'click') {
                $widgetHd.on('click', '[data-role="tab"]', function(event) {
                    event.preventDefault();

                    $.proxy(self._activeTab, self, $(this))();
                });
            } else if (triggerEvent == 'mouseover') {
                $widgetHd
                    .on('mouseover', '[data-role="tab"]', function() {
                        overTimer && clearTimeout(overTimer);

                        overTimer = setTimeout($.proxy(self._activeTab, self, $(this)), 500);
                    })
                    .on('mouseout', '[data-role="tab"]', function() {
                        overTimer && clearTimeout(overTimer);
                    });
            }
        },

        _activeTab: function($tab) {
            var c = this.cfg,
                activeCls = c.activeCls;

            var $tabs = this.$widgetHd.find('[data-role="tab"]');

            var targetId = $tab.data('target');

            $tabs.removeClass(activeCls);
            $tab.addClass(activeCls);

            this._activeTabContent(targetId);
        },

        // 通过index激活对应tab
        activeTabByIndex: function(index) {
            var c = this.cfg,
                activeCls = c.activeCls;

            var $tabs = this.$widgetHd.find('[data-role="tab"]'),
                $activeTab = null,
                targetId = '';

            // 若index合法
            if (index >= 0 && index < $tabs.length) {
                $activeTab = $tabs
                    .removeClass(activeCls)
                    .eq(index)
                    .addClass(activeCls);

                targetId = $activeTab.data('target');

                this._activeTabContent(targetId);
            }
        },

        _activeTabContent: function(targetId) {
            var $tabCons = this.$tabBody.find('> [data-role="tab-content"]');

            $tabCons
                .hide()
                .filter('[data-id="' + targetId + '"]')
                .show();
        }
    });
    new TabView({
        dom: `#${DIALOG_ID}-content`
    });
}
