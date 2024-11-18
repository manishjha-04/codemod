import type { ImageBlock } from "@/types/object.types";
import { cx } from "cva";
import { SanityImage } from "../SanityImage";

export default function ImageBlock(props: ImageBlock) {
  return (
    <div className="my-10 -mx-2 lg:-mx-10 flex flex-col gap-4">
      <div className={cx("overflow-hidden rounded-xl")}>
        {
          <SanityImage
            maxWidth={1440}
            alt={props.image.alt || ""}
            image={props.image}
          />
        }
      </div>
      {props.caption && (
        <p className="body-s-medium font-medium text-secondary-light dark:text-secondary-dark text-center pb-0">
          {props.caption}
        </p>
      )}
    </div>
  );
}
