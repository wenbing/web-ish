import Loading from "./Loading";
import Nav from "./Nav";

import "./Blog.css";

interface BlogProps extends RouteProps {
  allPosts: Record<string, string>[];
}

Blog.getInitialData = getInitialData;

export default function Blog(props: BlogProps) {
  const { isLoading, render, route, headers, error } = props;
  const loading = <Loading isLoading={isLoading}></Loading>;
  const nav = <Nav {...{ render, route, headers, error }}></Nav>;
  const { allPosts } = props;
  const title = props.route.params.title;
  let currentPost;
  if (title) {
    currentPost = allPosts.filter((item) => item.title === title)[0];
  } else {
    currentPost = allPosts[0];
  }

  return (
    <>
      {loading}
      {nav}
      <article
        className="blog-article"
        dangerouslySetInnerHTML={{ __html: currentPost.contents }}
      ></article>
      <footer className="blog-footer">
        <h2>BLOG POSTS</h2>
        <ul>
          {allPosts.map(({ title, href }) => (
            <li key={title}>
              <a href={href}>{title}</a>
            </li>
          ))}
        </ul>
      </footer>
    </>
  );
}

export async function getInitialData(props: TYPE_INITIAL_DATA) {
  if (process.env.BUILD_TARGET === "node") {
    const id =
      process.env.NODE_ENV === "production"
        ? "x-request-id" // @NOTICE use constant in production
        : props.headers["x-request-id"];
    const { getAllPosts } = await import(
      /* webpackIgnore: true */ `../server/post.mjs?id=${id}`
    );
    const allPosts = await getAllPosts();
    return { allPosts };
  }
  return props;
}
