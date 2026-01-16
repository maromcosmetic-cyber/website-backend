import { BundlesService } from './bundles.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
export declare class BundlesController {
    private readonly bundlesService;
    constructor(bundlesService: BundlesService);
    create(createBundleDto: CreateBundleDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateBundleDto: UpdateBundleDto): string;
    remove(id: string): string;
}
