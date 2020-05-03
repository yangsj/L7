import {
  ILayer,
  IPopup,
  LineLayer,
  PointLayer,
  PolygonLayer,
  Popup,
  Scene,
  StyleAttrField,
} from '@antv/l7';
// @ts-ignore
import geobuf from 'geobuf';
// tslint:disable-next-line: no-submodule-imports
import merge from 'lodash/merge';
// @ts-ignore
import Pbf from 'pbf';
import { IDistrictLayerOption } from './interface';
export default class BaseLayer {
  public fillLayer: ILayer;
  public lineLayer: ILayer;
  public labelLayer: ILayer;
  protected scene: Scene;
  protected options: IDistrictLayerOption;
  protected layers: ILayer[] = [];
  private popup: IPopup;

  constructor(scene: Scene, option: Partial<IDistrictLayerOption> = {}) {
    this.scene = scene;
    this.options = merge(this.getdefaultOption(), option);
  }

  public destroy() {
    this.layers.forEach((layer) => this.scene.removeLayer(layer));
    this.layers.length = 0;
  }

  public show() {
    this.layers.forEach((layer) => layer.show());
  }
  public hide() {
    this.layers.forEach((layer) => layer.hide());
  }
  protected async fetchData(data: { url: string; type: string }) {
    if (data.type === 'pbf') {
      const buffer = await (await fetch(data.url)).arrayBuffer();
      const geojson = geobuf.decode(new Pbf(buffer));
      return geojson;
    } else {
      return (await fetch(data.url)).json();
    }
  }
  protected getdefaultOption(): IDistrictLayerOption {
    return {
      zIndex: 0,
      depth: 1,
      label: {
        enable: true,
        color: '#000',
        field: 'name',
        size: 8,
        stroke: '#fff',
        strokeWidth: 2,
        textAllowOverlap: true,
        opacity: 1,
      },
      fill: {
        scale: null,
        field: null,
        values: '#fff',
      },
      autoFit: true,
      stroke: '#d95f0e',
      strokeWidth: 0.6,
      cityStroke: 'rgba(255,255,255,0.6)',
      cityStrokeWidth: 0.6,
      countyStrokeWidth: 0.6,
      provinceStrokeWidth: 0.6,
      provinceStroke: '#fff',
      countyStroke: 'rgba(255,255,255,0.6)',
      coastlineStroke: '#4190da',
      coastlineWidth: 1,
      nationalStroke: 'gray',
      nationalWidth: 1,
      popup: {
        enable: true,
        triggerEvent: 'mousemove',
        Html: (properties: any) => {
          return `${properties.name}`;
        },
      },
    };
  }

  protected addFillLayer(fillCountry: any) {
    // 添加省份填充
    const { popup, data = [], fill, autoFit } = this.options;
    const fillLayer = new PolygonLayer({
      autoFit,
    }).source(fillCountry, {
      transforms:
        data.length === 0
          ? []
          : [
              {
                type: 'join',
                sourceField: 'name', // data1 对应字段名
                targetField: 'name', // data 对应字段名 绑定到的地理数据
                data,
              },
            ],
    });
    fill.field
      ? fillLayer.color(fill.field, fill.values)
      : fillLayer.color(fill.values as string);

    if (fill.scale) {
      fillLayer.scale('color', {
        type: 'quantile',
        field: fill.field as string,
      });
    }
    fillLayer
      .shape('fill')
      .active({
        color: 'rgba(0,0,255,0.3)',
      })
      .style({
        opacity: 1,
      });
    this.fillLayer = fillLayer;
    this.layers.push(fillLayer);
    this.scene.addLayer(fillLayer);
    if (popup.enable) {
      this.addPopup();
    }
  }

  protected addFillLine(provinceLine: any) {
    const { stroke, strokeWidth, zIndex } = this.options;
    const layer2 = new LineLayer({
      zIndex: zIndex + 1,
    })
      .source(provinceLine)
      .color(stroke)
      .size(strokeWidth)
      .style({
        opacity: 1,
      });
    this.scene.addLayer(layer2);
    this.layers.push(layer2);
    this.lineLayer = layer2;
  }

  protected addLabelLayer(labelData: any, type: string = 'json') {
    const { label, zIndex } = this.options;
    const labelLayer = new PointLayer({
      zIndex: zIndex + 2,
    })
      .source(labelData, {
        parser: {
          type,
          coordinates: 'center',
        },
      })
      .color(label.color as StyleAttrField)
      .shape(label.field as StyleAttrField, 'text')
      .size(10)
      .style({
        opacity: label.opacity,
        stroke: label.stroke,
        strokeWidth: label.strokeWidth,
        textAllowOverlap: label.textAllowOverlap,
      });
    this.scene.addLayer(labelLayer);
    this.layers.push(labelLayer);
    this.labelLayer = labelLayer;
  }

  protected addPopup() {
    const { popup } = this.options;
    this.fillLayer.on('mousemove', (e) => {
      this.popup = new Popup({
        closeButton: false,
      })
        .setLnglat(e.lngLat)
        .setHTML(popup.Html ? popup.Html(e.feature.properties) : '');
      this.scene.addPopup(this.popup);
    });
  }
}
