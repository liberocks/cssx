import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  mono: 'font-mono',
  link: 'text-brand underline underline-offset-2',
});

export const richTextClasses = {
  mono: cssx.props(styles.mono).className,
  link: cssx.props(styles.link).className,
};
