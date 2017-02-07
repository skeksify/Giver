/**
 * Created by Skeksify on 17/01/2017.
 */

var updateIntervalInt;

$(function () {
    var $main = $('.main'),
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
        init_params = JSON.parse(initParamsStr || '{}'),
        usersObj = [],
        $list_block_template = $($('template.list-block-template').remove().html());

    enhanceJQ();
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
        var result = $list_block_template.clone(),
            img = getImage(item),
            timeObj = smartTime(item.timeUnix);
        result.find('.list-block-from').text(usersObj[item.sender[0]._id]);
        result.find('.list-block-tags').text(item.tags);
        result.find('.list-block-requires').text("< " + item.requires);
        result.find('.list-block-message').text(item.message);
        if (item.link) {
            result.find('.list-block-link')
                .text(getTitle(item))
                .attr('href', item.link)
        }
        img && result.find('img').attr('src', img);

        if (timeObj) {
            result.find('.list-block-time').attr('title', item.time).text(timeObj.str);
            setInterval(function () {
                result.find('.list-block-time').text(smartTime(item.timeUnix).str);
            }, timeObj.ref)
        }

        return result;
    }

    function getTitle(item) {
        return (item.metaTags && item.metaTags.title) ? item.metaTags.title : item.link;
    }
    function getImage(item) {
        return (item.metaTags && item.metaTags.og && item.metaTags.og.image) ? item.metaTags.og.image : '';
    }
    function smartTime(t) {
        var diff = (new Date()).getTime() - (+t),
            result, i, unitDiff,
            millisecArr = [24*60*60*1000, 60*60*1000, 60*1000, 1000],
            strArr = ['day', 'hour', 'minute', 'second'];

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
    }
    
    function logout() {
        $menu.find('.logged')._hide();
        $menu.find('.unlogged')._show();
        $give_dialog_wrapper._hide();
        $list.html('');
    }

    function login() {
        $menu.find('.unlogged')._hide();
        $menu.find('.logged')._show()
            .find('.username').text(init_params.username);
        loadUsers();
        loadList(init_params.list);
        loadUsersSelect();
        updateIntervalInt = setInterval(function () {
            updateList();
        }, 7500);
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
                url: "login",
                data: data,
                success: function (response) {
                    if (response.success) {
                        init_params = response.initParams;
                        login();
                    } else {
                        $login_error.text(response.error);
                    }
                }
            });
        }
    }

    function updateList() {
        $.ajax({
            method: "GET",
            url: "update",
            success: function (response) {
                loadList(response);
            }
        });
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
                    url: "give",
                    data: data,
                    success: function (response) {
                        if (response.success) {
                            $give_dialog_wrapper._hide();
                        } else {
                            $give_error.text('eRRRor');
                        }
                    }
                });
            }
        });
        $give_dialog_wrapper.find('.X').click(function () {
            $give_dialog_wrapper._hide();
        })
        $menu.find('.menu-give').click(function () {
            $give_dialog_wrapper
                ._show()
                .find('input,select').val('');

            // Dev junk data
            // $give_dialog.find('.give-to').val('5881359eac63cb1f603c8929');
            // $give_dialog.find('.give-tags').val((''+Math.random()).substr(2, 7));
            // $give_dialog.find('.give-requires').val(10);
            // $give_dialog.find('.give-message').val((''+Math.random()).substr(2, 7));
        });
        $menu.find('.menu-show-signup').click(function () {
            $signup._show();
            $login._hide();
        });
        $menu.find('.menu-show-login').click(function () {
            $signup._hide();
            $login._show();
        });
        $menu.find('.menu-signout').click(function () {
            $.ajax({
                method: "GET",
                url: "logout",
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
                    url: "signup",
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
    }

    function loadUsers() {
        var i, result = {}, arr = init_params.users;
        for (i = 0; i<arr.length; i++) {
            result[arr[i]._id] = arr[i].username;
        }
        usersObj = result;
    }

    function enhanceJQ() {
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
            flag ? this._show() : this._hide();
            return $(this);
        }
    }

    function cl() {
        console.log.apply(console.log, arguments);
    }
})