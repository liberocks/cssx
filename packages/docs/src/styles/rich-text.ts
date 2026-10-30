import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  mono: 'font-mono',
  link: 'underline-offset-2 text-brand underline',
});

export const richTextClasses = {
  mono: cssx.props(styles.mono).className,
  link: cssx.props(styles.link).className,
};
