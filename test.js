const axios = require('axios').default;
const client = new axios.Axios({"baseURL":"http://localhost:3002"})
const formdata = require('form-data')
var fs = require('fs');

var form = new formdata();
form.append('my_field', 'my value');
form.append('my_file', fs.createReadStream('./package.json'));
client.post('/images', form).then((data) => {
    console.log('ok')
})