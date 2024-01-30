import { useState } from 'react';

export const useDummy = () => {
  const [state, setState] = useState(false);

  const handleToggle = () => {
    setState(!state);
  };

  return { state, handleToggle };
};
