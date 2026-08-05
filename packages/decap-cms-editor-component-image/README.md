# decap-cms-editor-component-image

An editor component that registers the `image` markdown-embed syntax, letting editors insert
images directly in the Markdown widget's editor via a toolbar shortcut instead of hand-writing
Markdown image syntax.

It's registered with `CMS.registerEditorComponent` and exposed to consumers as
`editorComponents`.

## Markdown pattern

The component matches (and serializes to) standard Markdown image syntax with an optional title:

```md
![alt](src "title")
```

## Fields

| Name    | Widget  | Description                                                                        |
| ------- | ------- | ----------------------------------------------------------------------------------- |
| `image` | `image` | The image asset, selected via the image widget's media library (single asset only) |
| `alt`   | string  | The image's alt text                                                                |
| `title` | string  | The image's title attribute                                                         |

## Learn more

Check out the [main readme](https://github.com/decaporg/decap-cms/#readme) or the
[documentation site](https://www.decapcms.org) for more info, and reach out to the
[community chat](https://decapcms.org/chat/) if you need help.
