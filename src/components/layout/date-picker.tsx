"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export const DatePicker: React.FC<{ date: Date | undefined, setDate: React.Dispatch<React.SetStateAction<Date | undefined>> }> =
    ({ date, setDate }) => {
        return (
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "max-w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        )
    }
