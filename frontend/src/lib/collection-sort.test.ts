import assert from "node:assert/strict";
import test from "node:test";
import {sortCollection,sortDate,nextCollectionSort} from "./collection-sort.ts";
test("sorts numeric scores before pagination, keeps missing last in both directions and never mutates input",()=>{
 const rows=[{id:"a",score:10},{id:"z",score:2},{id:"missing",score:null}];
 assert.deepEqual(sortCollection(rows,r=>r.score,"asc").slice(0,2).map(r=>r.id),["z","a"]);
 assert.deepEqual(sortCollection(rows,r=>r.score,"desc").map(r=>r.id),["a","z","missing"]);
 assert.equal(rows[0].id,"a");
});
test("uses natural text ordering, real dates and stable ties",()=>{
 const rows=[{id:"a",name:"R-10"},{id:"b",name:"R-2"},{id:"c",name:"R-2"}];
 assert.deepEqual(sortCollection(rows,r=>r.name,"asc").map(r=>r.id),["c","b","a"]);
 assert.equal(sortDate("bad date"),null);
 assert.equal(sortDate("2026-01-01T07:00:00+07:00"),sortDate("2026-01-01T00:00:00Z"));
});

test("numeric zero remains a value and null/invalid dates stay last while changing direction",()=>{
 const rows=[{id:"zero",value:0},{id:"bad",value:NaN},{id:"one",value:1}];
 assert.deepEqual(sortCollection(rows,r=>r.value,"asc").map(r=>r.id),["zero","one","bad"]);
 assert.deepEqual(sortCollection(rows,r=>r.value,"desc").map(r=>r.id),["one","zero","bad"]);
});

test("column interaction toggles direction and selects useful initial directions",()=>{
 assert.deepEqual(nextCollectionSort({key:"Dibuat",direction:"desc"},"Risiko"),{key:"Risiko",direction:"asc"});
 assert.deepEqual(nextCollectionSort({key:"Risiko",direction:"asc"},"Risiko"),{key:"Risiko",direction:"desc"});
 assert.deepEqual(nextCollectionSort({key:"Risiko",direction:"desc"},"Skor"),{key:"Skor",direction:"desc"});
 assert.deepEqual(nextCollectionSort({key:"Skor",direction:"desc"},"Dibuat"),{key:"Dibuat",direction:"desc"});
});
