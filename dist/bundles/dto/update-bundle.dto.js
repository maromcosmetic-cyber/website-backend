"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBundleDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_bundle_dto_1 = require("./create-bundle.dto");
class UpdateBundleDto extends (0, mapped_types_1.PartialType)(create_bundle_dto_1.CreateBundleDto) {
}
exports.UpdateBundleDto = UpdateBundleDto;
//# sourceMappingURL=update-bundle.dto.js.map