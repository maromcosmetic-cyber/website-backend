import { Module, Global } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Global() // Make it global so we don't have to import it everywhere
@Module({
    providers: [WhatsappService],
    exports: [WhatsappService],
})
export class WhatsappModule { }
