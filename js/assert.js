/** Assertions  **/

var assert = function(statement, message)
{
        message = message || "Condition was not successful";
        if (statement)
                return;

        if (window.console) {
                console.log("Assertion failed");
                console.log(message);
        }

        if (assert.debug)
                debugger;

        if (assert.production)
                return;

        throw new "Assertion failed: "+message;
}
assert.debug = false;
assert.production = false;

exports = assert;
