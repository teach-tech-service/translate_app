const request = require('request');

let options = {
    method: 'GET',
    baseUrl: 'https://api.pons.com/v1/dictionary',
    headers: {
        'Content-type': 'application/x-www-form-urlencoded',
        "x-secret": "cd0132b6a2b33b6880d0b79dd1946a5456d00bc1b861cb1f281fea5f01313103",
    },
    body: [{
        q: "ich",
        in: "de",
        language: "de",
        l: "depl",
        ref: true,
        json: true,
    }]
};

const callExternalApiUsingRequest = (callback) => {
    request(options, function (err, res, body) {
        console.log(JSON.stringify(body, null, 4));
    });
}

module.exports.callApi = callExternalApiUsingRequest;