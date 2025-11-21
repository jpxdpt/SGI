import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from './Card';
import { Button } from './Button';

interface WelcomeCardProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  gradient?: 'purple' | 'blue' | 'green' | 'orange';
  className?: string;
}

const gradients = {
  purple: 'from-purple-500 to-pink-500',
  blue: 'from-blue-500 to-cyan-500',
  green: 'from-green-500 to-emerald-500',
  orange: 'from-orange-500 to-red-500',
};

export const WelcomeCard = ({
  title,
  message,
  actionLabel,
  onAction,
  gradient = 'purple',
  className,
}: WelcomeCardProps) => {
  return (
    <Card
      className={clsx(
        'relative overflow-hidden bg-gradient-to-br',
        gradients[gradient],
        'text-white border-0',
        className,
      )}
    >
      <div className="relative z-10">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-sm opacity-90 mb-4">{message}</p>
        {actionLabel && onAction && (
          <Button variant="secondary" size="sm" onClick={onAction} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
            {actionLabel}
          </Button>
        )}
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
    </Card>
  );
};





