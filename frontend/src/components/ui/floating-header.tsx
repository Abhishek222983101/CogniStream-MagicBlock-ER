"use client";

import React from 'react';
import { ActivityIcon, MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function FloatingHeader() {
  const [open, setOpen] = React.useState(false);

  const links = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Pipeline', href: '/pipeline' },
    { label: 'Results', href: '/results' },
    { label: 'AI Chat', href: '/chat' },
  ];

  return (
    <header
      className={cn(
        'sticky top-6 z-50',
        'mx-auto w-[95%] max-w-7xl border-brutal shadow-brutal',
        'bg-paper/95 backdrop-blur-sm transition-all duration-300'
      )}
    >
      <nav className="mx-auto flex items-center justify-between p-3 px-5 md:px-8">
        <Link href="/" className="hover:bg-cobalt/10 flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors border-2 border-transparent hover:border-charcoal">
          <ActivityIcon className="size-6 stroke-[2px] text-cobalt" />
          <p className="font-heading text-lg md:text-xl font-bold uppercase tracking-tight text-charcoal">CogniStream</p>
        </Link>
        <div className="hidden items-center gap-2 lg:flex px-4">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-2 font-mono text-sm font-bold uppercase hover:bg-charcoal hover:text-white transition-colors border-2 border-transparent hover:border-charcoal"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pipeline">
            <button className="hidden lg:flex brutal-btn bg-cobalt text-white text-sm h-10 px-6 items-center justify-center">
              Run Pipeline
            </button>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden border-brutal shadow-brutal-sm h-10 w-10 flex items-center justify-center hover:bg-charcoal hover:text-white transition-colors"
            >
              <MenuIcon className="size-5" />
            </button>
            <SheetContent
              side="left"
              className="p-0 gap-0 border-r-2 border-charcoal w-full sm:w-80 bg-paper"
              showClose={false}
            >
              <SheetHeader className="flex flex-row items-center justify-between border-brutal-b p-4">
                <SheetTitle className="font-heading font-bold uppercase tracking-tight text-charcoal">Menu</SheetTitle>
                <SheetClose className="border-2 border-charcoal p-2 hover:bg-charcoal hover:text-white transition-colors">
                  <MenuIcon className="size-5" />
                </SheetClose>
              </SheetHeader>
              <div className="grid gap-y-2 overflow-y-auto px-6 py-10 flex-grow">
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="font-mono text-lg font-bold uppercase py-3 border-b-2 border-transparent hover:border-charcoal transition-colors text-charcoal"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <SheetFooter className="gap-4 p-4 border-brutal-t">
                <Link href="/pipeline" className="w-full" onClick={() => setOpen(false)}>
                  <button className="brutal-btn bg-cobalt text-white w-full py-3 uppercase text-sm">
                    Run Pipeline
                  </button>
                </Link>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
