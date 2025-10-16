// GradientIcon.jsx
import React, { useId } from "react";

const GradientDefs = ({ id }) => (
  // small hidden svg that only holds the <defs> so other svgs can reference the gradient by id
  <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
    <defs>
      <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#a855f7" />   {/* purple-500 */}
        <stop offset="50%" stopColor="#6366f1" />  {/* indigo-400 */}
        <stop offset="100%" stopColor="#60a5fa" /> {/* blue-400 */}
      </linearGradient>
    </defs>
  </svg>
);

const GradientIcon = ({ Icon, className = "", strokeWidth = 2, id }) => {
  // use React's useId to generate a stable unique id if not provided
  const generatedId = id || `grad-${useId().replace(/:/g, "")}`;

  return (
    <>
      <GradientDefs id={generatedId} />
      {/* Pass stroke as url(#id) to the Lucide icon. Lucide forwards props to the underlying <svg> */}
      <Icon
        stroke={`url(#${generatedId})`}
        strokeWidth={strokeWidth}
        className={className}
      />
    </>
  );
};

export default GradientIcon;
