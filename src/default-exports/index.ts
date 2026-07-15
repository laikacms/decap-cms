import {
  withEmotionCache,
  CacheProvider,
  ThemeContext,
  jsx,
  Global,
  keyframes,
  ClassNames,
  css,
} from '@emotion/react';
import EmotionStyled from '@emotion/styled';
import * as Lodash from 'lodash-es';
import React from 'react';
import ReactDOM from 'react-dom';
import * as UUId from 'uuid';

const EmotionCore = {
  css,
  withEmotionCache,
  CacheProvider,
  ThemeContext,
  jsx,
  Global,
  keyframes,
  ClassNames,
};
export const DecapCmsDefaultExports = {
  EmotionCore,
  EmotionStyled,
  Lodash,
  React,
  ReactDOM,
  UUId,
};
