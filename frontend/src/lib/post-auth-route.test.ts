import assert from "node:assert/strict";
import test from "node:test";
const { getPostAuthRoute } = await import(new URL("./post-auth-route.ts",import.meta.url).href);
test("operator opens work and other roles retain overview",()=>{
 assert.equal(getPostAuthRoute("unit",false),"/work");
 for(const role of ["reviewer","pimpinan","superadmin",""])assert.equal(getPostAuthRoute(role,false),"/overview");
});
test("password setup takes precedence",()=>{
 for(const role of ["unit","reviewer","pimpinan","superadmin"])assert.equal(getPostAuthRoute(role,true),"/change-password");
});
