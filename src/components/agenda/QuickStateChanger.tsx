import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { AppointmentStateManager } from "./AppointmentStateManager";

type Estado = 'agendada' | 'confirmada' | 'en_atencion' | 'finalizada' | 'cancelada' | 'no_asiste';

interface QuickStateChangerProps {
  appointmentId: number;
  currentState: Estado;
  horaInicio: string;
  onDetailClick: () => void;
}

export function QuickStateChanger({
  appointmentId,
  currentState,
  horaInicio,
  onDetailClick,
}: QuickStateChangerProps) {
  const [stateDialogOpen, setStateDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setStateDialogOpen(true)}>
            Cambiar estado
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDetailClick}>
            Ver detalle completo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AppointmentStateManager
        appointmentId={appointmentId}
        currentState={currentState}
        horaInicio={horaInicio}
        open={stateDialogOpen}
        onOpenChange={setStateDialogOpen}
      />
    </>
  );
}
