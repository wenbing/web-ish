import { useEffect } from "react";
import Loading from "./Loading";
import Nav from "./Nav";
import { publicPath } from "./shared_routes.mjs";
import "./Blog.css";
import "./images/blog.ts";

interface BlogProps extends RouteProps {
  allPosts: Record<string, string>[];
  currentPost?: { contents: string; images: Record<string, string>[] };
}

Blog.getInitialData = getInitialData;
Blog.title = "wenbing's blog";

const defaultSrc =
  "data:image/svg+xml," +
  encodeURIComponent(
    `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100" height="100" fill="rgb(0 0 0 / 10%)" />
</svg>
  `.trim()
  );

const useLazyLoadImages = () => {
  if (typeof window === "undefined") return;
  if (!("IntersectionObserver" in window)) return;
  const imageObserver = new IntersectionObserver((entries /*, observer*/) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const image = entry.target as HTMLImageElement;
        image.src = image.dataset.src;
        image.classList.remove("image--lazy");
        imageObserver.unobserve(image);
      }
    });
  });
  const lazyloadImages = document.querySelectorAll(".image--lazy");
  lazyloadImages.forEach((image) => imageObserver.observe(image));
};

function ArticleFooter(props: BlogProps) {
  const { currentPost } = props;
  let gallery;
  if (currentPost && currentPost.images.length > 0) {
    const handleClick = (id) => {
      const el = document.getElementById(id);
      el && el.scrollIntoView({ behavior: "smooth" });
    };
    gallery = (
      <div className="blog-images">
        <h2 className="blog-images__title">图片索引</h2>
        <ul className="blog-images__list">
          {currentPost.images.map((item) => (
            <li key={item.href} className="blog-images__image">
              <img
                className="image--lazy"
                src={defaultSrc}
                data-src={item.href}
                alt={item.href}
                onClick={() => handleClick(item.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <footer className="blog-footer">
      {gallery}
      <div className="blog-allposts">
        <h2 className="blog-allposts__title">全部文章</h2>
        <ul className="blog-allposts__list">
          {props.allPosts.map(({ title, href }) => (
            <li key={title} className="blog-allposts__item">
              <a href={href}>{title}</a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

function BlogPost(props) {
  const name = props.route.params.name;
  const { allPosts, currentPost } = props;
  useEffect(() => useLazyLoadImages(), [props.route]);
  let article;
  if (currentPost) {
    const found = allPosts.filter((item) => item.name === name)[0];
    let contents;
    if (currentPost.contents) {
      contents = currentPost.contents;
      contents = `${contents}<p class="blog-article__updatetime">${found.publishTime} 更新。</p>`;
    } else {
      contents = `<p>获取文章内容失败，请刷新重试，<br/>name: ${name}</p>`;
    }
    article = (
      <article className="article">
        <div className="blog-article">
          <div dangerouslySetInnerHTML={{ __html: contents }}></div>
        </div>

        <ArticleFooter {...props} />
      </article>
    );
  } else {
    article = (
      <article className="article">
        <div className="blog-article">
          <h2>没有找到此文章</h2>
          {name}
        </div>
        <ArticleFooter {...props} />
      </article>
    );
  }
  return article;
}

function BlogIndex(props: BlogProps) {
  return (
    <div className="blog-index">
      <h2 className="blog-index__title">博客文章</h2>
      <ul>
        {props.allPosts.map((item) => (
          <li key={item.title} className="blog-index__post">
            <a className={"blog-index__posttitle"} href={item.href}>
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
    const name = props.route.params.name;
    if (name) {
      const uri = `${publicPath}/post/${name}.json`;
      const headers = new Headers({ "x-requested-with": "fetch" });
      const res = await fetch(uri, { headers });
      if (res.status === 200) {
        const currentPost = await res.json();
        return { currentPost };
      } else {
        return { currentPost: { contents: undefined, images: [] } };
      }
    }
  }
}
