import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Client-side navigation keeps the window scroll where the last page left
// it, so every page opened from the bottom of a long one appeared already
// scrolled to its own bottom. A new navigation starts reading from the top;
// back/forward (POP) is left alone so the browser can restore the position
// the visitor actually left that page at.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
