const success  = (val) => ({type: "success", val });
const error  = (val) => ({type: "error", val });
const map = (result, fn) => {
    if (result.type === "error") {
        return result;
    };

    return success(fn(result.val));
};

const flatMap = (result, fn) => {
    if (result.type === "error") {
        return result;
    };

    return fn(result.val);
};

const collect = (results) => {
    if (results.length === 0) {
        return success([]);
    };

    const [head, ...rest] = results;
    return flatMap(head, (head) => map(collect(rest), (rest) => [head, ...rest]));
};

const apply = (result, successFn, errFn) => {
    if (result.type === "success") {
        return successFn(result.val);
    } else {
        return errFn(result.val);
    };
};

module.exports = {
    success,
    error,
    map,
    flatMap,
    collect,
    apply,
}
