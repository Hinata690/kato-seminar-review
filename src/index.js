export default {
async fetch(request, env) {
const authHeader = request.headers.get("Authorization");
const expected = "Basic " + btoa(`${env.BASIC_AUTH_USER}:${env.BASIC_AUTH_PASS}`);

if (authHeader !== expected) {
return new Response("Authentication required.", {
status: 401,
headers: {
"WWW-Authenticate": 'Basic realm="Restricted Area", charset="UTF-8"',
},
});
}

return env.ASSETS.fetch(request);
},
};
