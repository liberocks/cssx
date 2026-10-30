/**
 * Maps a compiler semantic group to the documented source-format category.
 *
 * @param group CSSX utility write group.
 * @returns Stable formatting category, or null for unknown groups.
 */
export function formattingCategory(group: string): number | null {
  const normalized = group.replace(/^arbitrary\.\./, '');
  if (/^(?:flex|grid|justify|items|self|place|align|order)(?:-|$)/.test(normalized)) {
    return 1;
  }
  if (
    /^(?:size|width|height|min-width|max-width|min-height|max-height|inline-size|block-size|min-inline-size|max-inline-size|min-block-size|max-block-size|aspect-ratio)$/.test(
      normalized,
    )
  ) {
    return 2;
  }
  if (
    /^(?:p|px|py|ps|pe|pt|pr|pb|pl|m|mx|my|ms|me|mt|mr|mb|ml|gap|row-gap|column-gap|space-x|space-y)$/.test(
      normalized,
    ) ||
    /^(?:padding|margin|scroll-padding|scroll-margin|inset|top|right|bottom|left|start|end|border-spacing)(?:-|$)/.test(
      normalized,
    ) ||
    /^(?:inset|top|right|bottom|left|start|end)$/.test(normalized)
  ) {
    return 3;
  }
  if (
    /^(?:font|text|line-height|letter-spacing|vertical-align|white-space|word-break|text-indent|text-orientation|text-combine|hyphens|line-clamp|placeholder-color|writing-mode|unicode-bidi)(?:-|$)/.test(
      normalized,
    )
  ) {
    return 4;
  }
  if (/^(?:border|border-radius|outline|ring|divide)(?:-|$)/.test(normalized)) {
    return 5;
  }
  if (
    /^(?:background|bg|gradient|color|fill|stroke|accent|caret|mask|paint-order|shape-rendering|vector-effect|scrollbar|clip-rule)(?:-|$)/.test(
      normalized,
    )
  ) {
    return 6;
  }
  if (
    /^(?:opacity|box-shadow|filter|blur|brightness|contrast|drop-shadow|grayscale|hue-rotate|invert|saturate|sepia|backdrop|mix-blend|image-rendering)(?:-|$)/.test(
      normalized,
    )
  ) {
    return 7;
  }
  if (
    /^(?:transform|scale|rotate|translate|skew|animation|transition|duration|delay|ease|stagger|timeline|scroll-timeline|view-timeline|view-transition)(?:-|$)/.test(
      normalized,
    )
  ) {
    return 8;
  }
  if (
    /^(?:cursor|touch|user-select|pointer-events|appearance|resize|scroll-behavior|will-change|sr-only|select|focus|target|disabled)(?:-|$)/.test(
      normalized,
    )
  ) {
    return 9;
  }
  if (
    /^(?:display|position|visibility|z-index|overflow|overscroll|object|contain|columns|float|clear|isolation|list-style|tab-size|box-decoration|content-visibility|break-)/.test(
      normalized,
    )
  ) {
    return 0;
  }
  return null;
}
