import test from "tape";

if (typeof window !== "undefined") {
  (async function clientMainTest() {
    const tbc = await import("tap-browser-color");
    const undo = tbc();
    test.onFinish(() => undo());
    test.onFailure(() => undo());
  })();
}

async function someAsyncThing() {
  return new Promise((res) =>
    setTimeout(() => {
      console.log("delay 1s in someAsyncThing()");
      res(true);
    }, 1000)
  );
}
test("test using promises", async function (t) {
  const result = await someAsyncThing();
  t.ok(result);
});
