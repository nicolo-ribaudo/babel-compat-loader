export default function foo() { return 1; }
export const update = () => { foo = () => 2; };
