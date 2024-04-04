import Image from 'next/image';
import React from 'react';

interface PriceInfoCardProps {
  title: string;
  iconSrc: string;
  value: string;
}

const PriceInfoCard = ({ title, iconSrc, value }: PriceInfoCardProps) => {
  return (
    <div className="price-info_card">
      <div className="flex items-center gap-1">
        <p className="text-base text-black-100">{title}</p>
      </div>
      <div className="flex gap-1">
        <Image src={iconSrc} alt={title} width={24} height={24} />
        <p className="text-2xl font-bold text-secondary">{value}</p>
      </div>
    </div>
  );
};

export default PriceInfoCard;
