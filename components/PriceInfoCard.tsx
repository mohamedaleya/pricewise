import Image from 'next/image';
import React from 'react';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CalendarIcon } from 'lucide-react';

dayjs.extend(LocalizedFormat);

interface PriceInfoCardProps {
  title: string;
  iconSrc: string;
  value: string;
  date?: Date | string | null;
}

const PriceInfoCard = ({ title, iconSrc, value, date }: PriceInfoCardProps) => {
  return (
    <div className="price-info_card">
      <div className="flex items-center gap-1">
        <p className="text-base text-black-100">{title}</p>
      </div>
      <div className="flex items-center gap-1">
        <Image src={iconSrc} alt={title} width={24} height={24} />
        <p className="text-2xl font-bold text-secondary">{value}</p>
        {date && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CalendarIcon className="ml-1 h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600" />
              </TooltipTrigger>
              <TooltipContent className="px-3 py-2">
                <p className="text-xs">Recorded: {dayjs(date).format('LLL')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

export default PriceInfoCard;
