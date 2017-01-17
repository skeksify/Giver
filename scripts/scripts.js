/**
 * Created by Skeksify on 17/01/2017.
 */


$(function () {
    $('.send-link-button').click(function () {
        var data = {
            user: $('.send-link-user').val(),
            link: $('.send-link-link').val()
        }
        $.ajax({
            method: "POST",
            url: "send",
            data: data,
            success: function(msg) {
                console.log(msg);
            }
        });
    })
})