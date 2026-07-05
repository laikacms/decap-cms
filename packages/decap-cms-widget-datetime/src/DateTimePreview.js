import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import { WidgetPreviewContainer } from 'decap-cms-ui-default';

import { getFormat, hasFormatOptions } from './DateTimeFormatter';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

function formatValue(value, field) {
  const raw = value.toString();

  if (!field || !hasFormatOptions(field)) {
    return raw;
  }

  const { format, isUtc } = getFormat(field);
  const parsed = isUtc ? dayjs.utc(value) : dayjs(value);

  if (!parsed.isValid()) {
    return raw;
  }

  return parsed.format(format);
}

function DatePreview({ value, field }) {
  return (
    <WidgetPreviewContainer>{value ? formatValue(value, field) : null}</WidgetPreviewContainer>
  );
}

DatePreview.propTypes = {
  value: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  field: PropTypes.object,
};

export default DatePreview;
