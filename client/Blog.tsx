import Loading from "./Loading";
import Nav from "./Nav";

import "./Blog.css";
import { publicPath } from "./shared_routes.mjs";

interface BlogProps extends RouteProps {
  allPosts: Record<string, string>[];
  currentPost?: { contents: string };
}

Blog.getInitialData = getInitialData;
Blog.title = "wenbing's blog";

const clickHandler = (evt) => {
  if (evt.target.tagName.toLowerCase() !== "img") {
    return;
  }
};
function BlogNav(props: BlogProps) {
  return (
    <footer className="blog-footer">
      <h2>文章列表</h2>
      <ul>
        {props.allPosts.map(({ title, href }) => (
          <li key={title}>
            <a href={href}>{title}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}

function BlogPost(props) {
  const name = props.route.params.name;
  const { allPosts, currentPost } = props;
  let article;
  if (currentPost) {
    const found = allPosts.filter((item) => item.name === name)[0];
    const contents = `${currentPost.contents}<p class="blog-article__updatetime">${found.publishTime} 更新。</p>`;
    article = (
      <article className="article">
        <div
          onClick={clickHandler}
          className="blog-article"
          dangerouslySetInnerHTML={{ __html: contents }}
        ></div>

        <BlogNav {...props} />
      </article>
    );
  } else {
    article = (
      <article className="blog-article">
        <>
          <h2>没有找到文章</h2>
          {name}
        </>
      </article>
    );
  }
  return article;
}

function BlogIndex(props: BlogProps) {
  return (
    <div className="blog-index">
      <h2>博客文章</h2>
      <ul>
        {props.allPosts.map((item) => (
          <li key={item.title}>
            <a className={"blog-index__title"} href={item.href}>
              {item.title}
            </a>
            <span className="blog-index__updatetime">
              {item.publishTime} 更新。
            </span>
            <div
              className="blog-index__abstract"
              dangerouslySetInnerHTML={{ __html: item.beginner }}
            ></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Blog(props: BlogProps) {
  const { isLoading, render, route, url, headers, error } = props;
  const loading = <Loading isLoading={isLoading}></Loading>;
  const nav = <Nav {...{ render, route, url, headers, error }}></Nav>;

  const name = props.route.params.name;

  let content;
  if (name) {
    content = <BlogPost {...props} />;
  } else {
    content = <BlogIndex {...props} />;
  }

  return (
    <>
      {loading}
      {nav}
      {content}
    </>
  );
}

export async function getInitialData(props: TYPE_INITIAL_DATA) {
  if (process.env.BUILD_TARGET === "node") {
    // @TODO dotToSvg
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new URL("./a_blog.svg", import.meta.url);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new URL("./a_framework.svg", import.meta.url);

    const id =
      process.env.NODE_ENV === "production"
        ? "x-request-id" // @NOTICE use constant in production
        : props.headers["x-request-id"];
    const { getAllPosts, getCurrentPost } = await import(
      /* webpackIgnore: true */ `../server/post.mjs?id=${id}`
    );
    const allPosts = await getAllPosts({});
    const name = props.route.params.name;
    const currentPost = await getCurrentPost({ name });
    return { allPosts, currentPost };
  } else {
    const token = props.headers.token;
    const name = props.route.params.name;
    //@TODO jwt expired how to
    const currentPost = await (
      await fetch(`${publicPath}/post.json${name ? `?name=${name}` : ""}`, {
        headers: new Headers({ "x-requested-with": "fetch", token }),
      })
    ).json();
    return { currentPost };
  }
}
