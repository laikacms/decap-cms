import type { FC, SVGProps } from 'react';

import iconAdd from './add.svg';
import iconAddWith from './add-with.svg';
import iconArrow from './arrow.svg';
import iconAzure from './azure.svg';
import iconBitbucket from './bitbucket.svg';
import iconBold from './bold.svg';
import iconCheck from './check.svg';
import iconChevron from './chevron.svg';
import iconChevronDouble from './chevron-double.svg';
import iconCircle from './circle.svg';
import iconClose from './close.svg';
import iconCode from './code.svg';
import iconCodeBlock from './code-block.svg';
import iconDragHandle from './drag-handle.svg';
import iconEye from './eye.svg';
import iconFolder from './folder.svg';
import iconGithub from './github.svg';
import iconGitlab from './gitlab.svg';
import iconGitea from './gitea.svg';
import iconGrid from './grid.svg';
import iconH1 from './h1.svg';
import iconH2 from './h2.svg';
import iconHOptions from './h-options.svg';
import iconHome from './home.svg';
import iconImage from './image.svg';
import iconInfoCircle from './info-circle.svg';
import iconItalic from './italic.svg';
import iconLink from './link.svg';
import iconList from './list.svg';
import iconListBulleted from './list-bulleted.svg';
import iconListNumbered from './list-numbered.svg';
import iconMarkdown from './markdown.svg';
import iconMedia from './media.svg';
import iconMediaAlt from './media-alt.svg';
import iconDecap from './decap.svg';
import iconNewTab from './new-tab.svg';
import iconPage from './page.svg';
import iconPages from './pages.svg';
import iconPagesAlt from './pages-alt.svg';
import iconQuote from './quote.svg';
import iconRefresh from './refresh.svg';
import iconScroll from './scroll.svg';
import iconSearch from './search.svg';
import iconSettings from './settings.svg';
import iconStrikethrough from './strikethrough.svg';
import iconUser from './user.svg';
import iconWorkflow from './workflow.svg';
import iconWrite from './write.svg';

export type IconComponent = FC<SVGProps<SVGSVGElement>>;

export interface IconImages {
  add: IconComponent;
  'add-with': IconComponent;
  arrow: IconComponent;
  azure: IconComponent;
  bitbucket: IconComponent;
  bold: IconComponent;
  check: IconComponent;
  chevron: IconComponent;
  'chevron-double': IconComponent;
  circle: IconComponent;
  close: IconComponent;
  code: IconComponent;
  'code-block': IconComponent;
  'drag-handle': IconComponent;
  eye: IconComponent;
  folder: IconComponent;
  github: IconComponent;
  gitlab: IconComponent;
  gitea: IconComponent;
  grid: IconComponent;
  h1: IconComponent;
  h2: IconComponent;
  hOptions: IconComponent;
  home: IconComponent;
  image: IconComponent;
  'info-circle': IconComponent;
  italic: IconComponent;
  link: IconComponent;
  list: IconComponent;
  'list-bulleted': IconComponent;
  'list-numbered': IconComponent;
  markdown: IconComponent;
  media: IconComponent;
  'media-alt': IconComponent;
  decap: IconComponent;
  'decap-cms': IconComponent;
  'new-tab': IconComponent;
  page: IconComponent;
  pages: IconComponent;
  'pages-alt': IconComponent;
  quote: IconComponent;
  refresh: IconComponent;
  scroll: IconComponent;
  search: IconComponent;
  settings: IconComponent;
  strikethrough: IconComponent;
  user: IconComponent;
  workflow: IconComponent;
  write: IconComponent;
}

const images: IconImages = {
  add: iconAdd,
  'add-with': iconAddWith,
  arrow: iconArrow,
  azure: iconAzure,
  bitbucket: iconBitbucket,
  bold: iconBold,
  check: iconCheck,
  chevron: iconChevron,
  'chevron-double': iconChevronDouble,
  circle: iconCircle,
  close: iconClose,
  code: iconCode,
  'code-block': iconCodeBlock,
  'drag-handle': iconDragHandle,
  eye: iconEye,
  folder: iconFolder,
  github: iconGithub,
  gitlab: iconGitlab,
  gitea: iconGitea,
  grid: iconGrid,
  h1: iconH1,
  h2: iconH2,
  hOptions: iconHOptions,
  home: iconHome,
  image: iconImage,
  'info-circle': iconInfoCircle,
  italic: iconItalic,
  link: iconLink,
  list: iconList,
  'list-bulleted': iconListBulleted,
  'list-numbered': iconListNumbered,
  markdown: iconMarkdown,
  media: iconMedia,
  'media-alt': iconMediaAlt,
  decap: iconDecap,
  'decap-cms': iconDecap,
  'new-tab': iconNewTab,
  page: iconPage,
  pages: iconPages,
  'pages-alt': iconPagesAlt,
  quote: iconQuote,
  refresh: iconRefresh,
  scroll: iconScroll,
  search: iconSearch,
  settings: iconSettings,
  strikethrough: iconStrikethrough,
  user: iconUser,
  workflow: iconWorkflow,
  write: iconWrite,
};

export default images;
