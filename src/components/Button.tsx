import { useDummy } from '@/hooks/useDummy';

export const Button = () => {
  const { state, handleToggle } = useDummy();

  return (
    <div>
      {`${state}`}
      <button onClick={handleToggle}>Click me!</button>
    </div>
  );
};
