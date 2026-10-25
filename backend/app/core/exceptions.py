from fastapi import HTTPException, status


class UBFDException(HTTPException):
    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class TenantAccessDenied(UBFDException):
    def __init__(self, detail: str = "Access denied to requested tenant resources"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class AccountNotFound(UBFDException):
    def __init__(self, detail: str = "Requested bank account was not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class EntityNotFound(UBFDException):
    def __init__(self, detail: str = "Requested business entity was not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class InvalidTransactionData(UBFDException):
    def __init__(self, detail: str = "Transaction payload failed validation or balance check"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class NettingPairNotFound(UBFDException):
    def __init__(self, detail: str = "Inter-company contra pair not found or already dissolved"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ConcurrencyConflict(UBFDException):
    def __init__(self, detail: str = "Ledger version conflict detected; please retry transaction"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
