/**
 * Created by Skeksify on 17/01/2017.
 */


$(function () {
    var $signup = $('.signup'),
        $login = $('.login'),
        $menu = $('.menu'),
        $signupError = $signup.find('.error-message'),
        $loginError = $login.find('.error-message'),
        initParams = JSON.parse(initParamsStr);

    enhanceJQ();
    bindEvents();

    if (initParams.isLogged){
        login();
    } else {
        logout();
    }

    function logout() {
        $menu.find('.logged')._hide();
        $menu.find('.unlogged')._show();
    }

    function login() {
        $menu.find('.unlogged')._hide();
        $menu.find('.logged')._show()
            .find('.username').text(initParams.username);
    }

    function bindEvents() {
        $('.showSignup').click(function () {
            $signup._show();
            $login._hide();
        });
        $('.showLogin').click(function () {
            $signup._hide();
            $login._show();
        });
        $login.find('.login-button').click(function () {
            var un = $login.find('.login-username').val(),
                pss = $login.find('.login-password').val(),
                data = {username: un, password: pss, rm: $login.find('.login-rm').is(':checked')};

            $loginError.text('');
            if (!un || !pss) {
                $loginError.text('All fields necessary');
            } else {
                $.ajax({
                    method: "POST",
                    url: "login",
                    data: data,
                    success: function (response) {
                        if (response.success) {
                            initParams = response.initParams;
                            login();
                        } else {
                            $loginError.text(response.error);
                        }
                    }
                });
            }
        });
        $signup.find('.signup-button').click(function () {
            var un = $signup.find('.signup-username').val(),
                pss = $signup.find('.signup-password').val(),
                pss2 = $signup.find('.signup-password2').val(),
                data = {
                    username: un,
                    password: pss
                }
            $signupError.text('');
            if (!un || !pss || !pss2) {
                $signupError.text('All fields necessary');
            } else if (pss !== pss2) {
                $signupError.text('Passwords don\'t match');
            } else {
                $.ajax({
                    method: "POST",
                    url: "signup",
                    data: data,
                    success: function (response) {
                        if (response.success) {
                            $signupError.text('Sign up success!');
                        } else {
                            $signupError.text(response.error);
                        }
                    }
                });
            }
        });
        $menu.find('.signout').click(function () {
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
        })
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
})