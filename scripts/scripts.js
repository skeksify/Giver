/**
 * Created by Skeksify on 17/01/2017.
 */

var updateIntervalInt;

$(function () {
    var
        isExtension = false,
        extensionDebug = false,
        domain = (isExtension && !extensionDebug) ? 'https://item-giver.herokuapp.com/' : '',
        defaultLogo = 'ri/defaultItem.png',
        usersObj = [],
        refreshInterval = 5000,
        currentListType = 'incoming',
        $overlay = $('.overlay'),
        $main = $('.main'),
        $signup = $main.find('.signup'),
        $login = $main.find('.login'),
        $menu = $main.find('.menu'),
        $list = $main.find('.list'),
        $give_dialog_wrapper = $main.find('.give-dialog-wrapper'),
        $give_dialog = $give_dialog_wrapper.find('.give-dialog'),
        $give_error = $give_dialog_wrapper.find('.error-message'),
        $users_select = $give_dialog.find('.give-to'),
        $signup_error = $signup.find('.error-message'),
        $login_error = $login.find('.error-message'),
        init_params = JSON.parse((isExtension ? localStorage.getItem('init_params') : initParamsStr) || '{}'),
        $list_block_template = $($('template.list-block-template').remove().html());
    
    enhancements();
    bindEvents();

    if (init_params.isLogged){
        login();
    } else {
        logout();
    }

    function loadUsersSelect() {
        $users_select.html('<option value="">Pick</option>');
        for (var key in usersObj) {
            $users_select.append($('<option/>').val(key).text(usersObj[key]));
        }
    }

    function makeBlock(item) {
        var $result = $list_block_template.clone(),
            img = getImage(item),
            timeObj = smartTime(item.timeUnix),
            $submenu = $result.find('.list-block-menu'),
            $link = $result.find('.list-block-link'),
            $tagsWrapper = $result.find('.list-block-tags-wrapper');

        fillWithTags(item.tags, $tagsWrapper);
        $result.find('.list-block-from').text(usersObj[item.sender[0]._id]);
        $result.find('.list-block-requires').text("< " + item.requires);
        $result.find('.list-block-message').html(item.message);
        if (item.link) {
            $link
                .text(getTitle(item))
                .attr('href', item.link);
            if (!item.read) {
                $result.addClass('unread');
                if (!currentListType.is('sent')) {
                    $link
                        .click(function () {
                            $result.removeClass('unread');
                            unreadItem.call($result, item._id, true);
                        })
                }
            }
        }
        img && $result.find('img').attr('src', img);

        if (timeObj) {
            $result.find('.list-block-time').attr('title', item.time).text(timeObj.str);
            setInterval(function () {
                $result.find('.list-block-time').text(smartTime(item.timeUnix).str);
            }, timeObj.ref)
        }
        $result.find('.list-block-menu-opener').hover(function (e) {
            $('.list-block-menu')._hide();
            $submenu._show();
            e.stopPropagation(); // Don't let document.click close it
        });
        $result.find('.list-block-menu').hover(noOp, function () {
            $submenu._hide();
        })
        $submenu.find('.list-block-menu-archive')
            .addClass('hooked')
            .click(archiveItem.bind($result, item._id, true));
        $submenu.find('.list-block-menu-unarchive')
            .addClass('hooked')
            .click(archiveItem.bind($result, item._id, false));
        $submenu.find('.list-block-menu-unread')
            .addClass('hooked')
            .click(unreadItem.bind($result, item._id, false));
        $submenu.find('.list-block-menu-read')
            .addClass('hooked')
            .click(unreadItem.bind($result, item._id, true));
        $submenu.find('.list-block-menu-forward')
            .addClass('hooked')
            .click(openGiveDialog.bind($result, item));

        // $result.hover(function () {
        //     $list.find('.gift_detailed')._hide();
        //     $result.find('.gift_detailed')._show();
        // })

        return $result;
    }

    function fillWithTags(tagsStr, $tagsWrapper) {
        var tagsArr = tagsStr.trim().split(tagsStr.has(',') ? ',' : ' '),
            $item = $tagsWrapper.find('.tag-item');

        $tagsWrapper.empty();
        tagsArr.forEach(function (tag) {
            $tagsWrapper.append($item.clone().text(tag.trim()))
        })
    }

    function htmlEncode(str) {
        var el = document.createElement("div");
        el.innerText = el.textContent = str;
        return el.innerHTML;
    }
    function htmlDecode(str) {
        var el = document.createElement("div");
        el.innerHTML = str;
        return el.innerText;
    }

    function unreadItem(id, markAsRead) {
        var $block = this;
        $.ajax({
            method: 'POST',
            url: domain + 'read',
            data: { id: id, read: !!markAsRead },
            success: function (response) {
                if (response.success) {
                    $block.toggleClass('unread', !markAsRead);
                } else {
                    cl(response);
                }
            }
        });
    }

    function archiveItem(id, markAsArchived) {
        var $item = this;
        $.ajax({
            method: 'POST',
            url: domain + 'archive',
            data: { id: id, archived: markAsArchived },
            success: function (response) {
                if (response.success) {
                    $item._hide();
                } else {
                    cl(response);
                }
            }
        });
    }

    function getTitle(item) {
        return (item.metaTags && item.metaTags.title) ? htmlDecode(item.metaTags.title) : item.link;
    }
    function getImage(item) {
        return (item.metaTags && item.metaTags.og && item.metaTags.og.image) ? item.metaTags.og.image : defaultLogo;
    }
    function smartTime(t) {
        var diff = (new Date()).getTime() - (+t),
            result, i, unitDiff,
            millisecArr = [24*60*60*1000, 60*60*1000, 60*1000, 1000],
            strArr = ['day', 'hour', 'min', 'second'];

        for (i = 0; i<millisecArr.length && !result; i++) {
            unitDiff = parseInt(diff / millisecArr[i]);
            if (unitDiff > 0) {
                result = {
                    str: unitDiff + ' ' + strArr[i] + (unitDiff > 1 ? 's' : '') + ' ago',
                    ref: millisecArr[i] * (i === 3 ? 12 : 1)
                }
            }
        }
        return result;
    }

    function loadList(list) {
        var i, itemsArr = [];

        for (i=0; i<list.length; i++) {
            itemsArr.push(makeBlock(list[i]));
        }

        $list.prepend(itemsArr.reverse());

        if (currentListType.is('archived')) {
            $list.find('.list-block-menu-unarchive')._show();
        }
    }

    function logout() {
        $menu.find('.logged')._hide();
        $menu.find('.unlogged')._show();
        $give_dialog_wrapper._hide();
        $list.empty();
        if (isExtension) {
            localStorage.setItem("init_params", '');
        }
        updateIntervalInt && (clearInterval(updateIntervalInt) || (updateIntervalInt = 0));
    }

    function login() {
        $menu.find('.unlogged')._hide();
        $menu.find('.logged')._show()
            .find('.username').text(init_params.username);
        loadUsers();
        loadList(init_params.list);
        loadUsersSelect();
        if (1 || isExtension) {
            updateIntervalInt = setInterval(poll, refreshInterval);
            poll();
        }
    }

    function tryToLogin() {
        var un = $login.find('.login-username').val(),
            pss = $login.find('.login-password').val(),
            data = { username: un, password: pss, rm: $login.find('.login-rm').is(':checked') };

        $login_error.text('');
        if (!un || !pss) {
            $login_error.text('All fields necessary');
        } else {
            $.ajax({
                method: "POST",
                url: domain + "login",
                data: data,
                success: function (response) {
                    if (response.success) {
                        init_params = response.initParams;
                        updateLSIfExtension();
                        login();
                    } else {
                        $login_error.text(response.error);
                    }
                }
            });
        }
    }

    function updateLSIfExtension() {
        if (isExtension) {
            localStorage.setItem('init_params', JSON.stringify(init_params));
        }
    }

    function poll() {
        var type = $list.attr('listType'),
            params = type && !type.is('incoming') ? ('?listType=' + type) : '';
        $.ajax({
            method: 'GET',
            url: domain + 'poll' + params,
            success: function (response) {
                // List, unempty
                if (response.constructor === Array && response.length) {
                    init_params.list = init_params.list.concat(response);
                    updateLSIfExtension();
                    loadList(response);
                    // Auto logged in, new data
                } else if (response.success && init_params.list.length !== response.initParams.list.length) {
                    init_params = response.initParams;
                    login();
                // Not logged in
                } else if (response.success === false && response.error && response.error.is('not-logged-in')) {
                    logout();
                }
                // Must be empty list
            }
        });
    }

    function openGiveDialog(item) {
        var key, classesToValues;
        if (item) { // Load data
            classesToValues = {
                '.give-tags': item.tags,
                '.give-requires': item.requires,
                '.give-message': item.message,
                '.give-link': item.link
            }
            for (key in classesToValues) {
                $give_dialog.find(key).val(classesToValues[key]);
            }
        } else { // Clear data
            $give_dialog_wrapper.find('input,select').val('');
        }
        
        window.scrollTo(0,0);

        $give_dialog_wrapper._show();
        $overlay._show();
        // Dev junk data
        // $give_dialog.find('.give-to').val('5881359eac63cb1f603c8929');
        // $give_dialog.find('.give-tags').val((''+Math.random()).substr(2, 7));
        // $give_dialog.find('.give-requires').val(10);
        // $give_dialog.find('.give-message').val((''+Math.random()).substr(2, 7));
    }
    function closeGiveDialog() {
        $give_dialog_wrapper._hide();
        $overlay._hide();
    }

    function bindEvents() {
        $give_dialog.find('.give-button').click(function () {
            var to = $give_dialog.find('.give-to').val(),
                tags = $give_dialog.find('.give-tags').val(),
                requires = $give_dialog.find('.give-requires').val(),
                message = $give_dialog.find('.give-message').val(),
                link = $give_dialog.find('.give-link').val(),
                data = {
                    to_id: to,
                    tags: tags,
                    requires: requires,
                    message: message,
                    link: link
                };
            $give_error.text('');
            if (!to || !tags || !requires || !message || !link ) {
                $give_error.text('All fields necessary');
            } else {
                $.ajax({
                    method: "POST",
                    url: domain + "give",
                    data: data,
                    success: function (response) {
                        if (response.success) {
                            closeGiveDialog();
                        } else {
                            $give_error.text('eRRRor');
                            console.log(response);
                        }
                    }
                });
            }
        });
        $overlay.click(closeGiveDialog)
        $give_dialog_wrapper.find('.X').click(closeGiveDialog)
        $menu.find('.menu-give').click(openGiveDialog);
        $menu.find('.menu-list-selector').change(function () {
            currentListType = $(this).val();
            $.ajax({
                method: 'GET',
                url: domain + 'list',
                data: 'listType=' + currentListType,
                success: function (response) {
                    if (response.success) {
                        $list.attr('listType', currentListType).empty();
                        if (currentListType.is('incoming')) {
                            init_params.list = response.initParams.list;
                            updateLSIfExtension();
                        }
                        loadList(response.initParams.list);
                    } else {
                        console.log(response)
                    }
                }
            });
        });
        $menu.find('.menu-show-signup').click(function () {
            $signup._show();
            $login._hide();
            $menu.find('.menu-show-signup').addClass('selected');
            $menu.find('.menu-show-login').removeClass('selected');
        });
        $menu.find('.menu-show-login').click(function () {
            $signup._hide();
            $login._show();
            $menu.find('.menu-show-login').addClass('selected');
            $menu.find('.menu-show-signup').removeClass('selected');
        });
        $menu.find('.menu-signout').click(function () {
            $.ajax({
                method: "GET",
                url: domain + "logout",
                success: function (response) {
                    if (response.success) {
                        logout();
                    } else {
                        console.log("Ooops?")
                    }
                }
            });
        });
        $login.find('.login-username').keypress(function (e) {
            if (e.which === 13) {
                $login.find('.login-password').focus();
            }
        });
        $login.find('.login-password').keypress(function (e) {
            if (e.which === 13) {
                tryToLogin();
            }
        });
        $login.find('.login-button').click(tryToLogin);
        $signup.find('.signup-button').click(function () {
            var un = $signup.find('.signup-username').val(),
                pss = $signup.find('.signup-password').val(),
                pss2 = $signup.find('.signup-password2').val(),
                data = {
                    username: un,
                    password: pss
                }
            $signup_error.text('');
            if (!un || !pss || !pss2) {
                $signup_error.text('All fields necessary');
            } else if (pss !== pss2) {
                $signup_error.text('Passwords don\'t match');
            } else {
                $.ajax({
                    method: "POST",
                    url: domain + "signup",
                    data: data,
                    success: function (response) {
                        if (response.success) {
                            $signup_error.text('Sign up success!');
                        } else {
                            $signup_error.text(response.error);
                        }
                    }
                });
            }
        });
        // $(document).click(function () {
        //     $('.list-block-menu')._hide();
        // })
    }

    function loadUsers() {
        var i, result = {}, arr = init_params.users;
        for (i = 0; i<arr.length; i++) {
            result[arr[i]._id] = arr[i].username;
        }
        usersObj = result;
    }

    function enhancements() {
        $.isUn = function (ob) {
            return typeof(ob) === 'undefined';
        }
        $.fn._hide = function () {
            $(this).addClass('hidden');
            return $(this);
        }
        $.fn._show = function () {
            $(this).removeClass('hidden');
            return $(this);
        }
        $.fn._toggle = function (flag) {
            (typeof(flag) === 'boolean' ? flag : $(this).hasClass('hidden')) ? this._show() : this._hide();
            return $(this);
        }
        String.prototype.is = function (str) {
            return this.toLowerCase() === str.toLowerCase();
        }
        String.prototype.has = function (str) {
            return this.toLowerCase().indexOf(str.toLowerCase()) > -1;
        }
    }

    function cl() {
        console.log.apply(console.log, arguments);
    }

    function noOp() { }
})