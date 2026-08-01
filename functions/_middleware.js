export async function onRequest(context) {
const { request, env, next } = context;

const user = env.BASIC_AUTH_USER;
const pass = env.BASIC_AUTH_PASS;

const authHeader = request.headers.get("Authorization");
const expected = "Basic " + btoa(`${user}:${pass}`);

if (authHeader !== expected) {
return new Response("Authentication required.", {
status: 401,
headers: {
"WWW-Authenticate": 'Basic realm="Restricted Area", charset="UTF-8"',
},
});
}

return next();
}
