# decap-cms-widget-map

Map widget for [Decap CMS](https://decapcms.org). Renders an interactive [OpenLayers](https://openlayers.org/)
map for drawing a point, line, or polygon, and stores the result as a GeoJSON string.

## Configuration options

| Option     | Type   | Default   | Description |
|------------|--------|-----------|--------------|
| `label`    | string | Field `name` | Label for the field in the editor UI. |
| `name`     | string | —         | Unique field identifier. |
| `decimals` | integer | `7`      | Number of decimal places of precision to store for coordinates. |
| `type`     | string | `Point`   | Geometry type to draw/store. Valid values: `Point`, `LineString`, `Polygon`. |
| `default`  | string (GeoJSON) | `''` (empty string) | Default GeoJSON value used when no value is set yet. |
| `height`   | string | `'400px'` | CSS `height` applied to the rendered map container (e.g. `'400px'`, `'50vh'`). |

## Example

```yaml
- label: "Location"
  name: "location"
  widget: "map"
  type: "Point"
  decimals: 5
  height: "600px"
```
