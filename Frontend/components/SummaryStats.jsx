import React, { useEffect } from "react";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] });

const SummaryStats = ({detailsCount}) => {
  
  return (
    <div className="w-full bg-white grid grid-cols-2 md:grid-cols-4 gap-4 p-6 text-center text-gray-800">
      <div className={`${inter.className} bg-white p-4 rounded-lg shadow-md`}>
        <h1 className="text-2xl font-bold">{detailsCount?.UserCount}</h1>
        <span className="text-gray-600">Users</span>
      </div>
      <div className={`${inter.className} bg-white p-4 rounded-lg shadow-md`}>
        <h1 className="text-2xl font-bold">{detailsCount?.GroupsCount}</h1>
        <span className="text-gray-600">Groups</span>
      </div>
      <div className={`${inter.className} bg-white p-4 rounded-lg shadow-md`}>
        <h1 className="text-2xl font-bold">{detailsCount?.ArticleCount}</h1>
        <span className="text-gray-600">Articles</span>
      </div>
      <div className={`${inter.className} bg-white p-4 rounded-lg shadow-md`}>
        <h1 className="text-2xl font-bold">{detailsCount?.AnnotationCount}</h1>
        <span className="text-gray-600">Annotations</span>
      </div>
    </div>
  );
};

export default SummaryStats;
