import test from "tape";
import tbc from "tap-browser-color";

const undo = tbc();

async function someAsyncThing() {
  return new Promise((res, rej) =>
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

test.onFinish(() => undo());
test.onFailure(() => undo());
