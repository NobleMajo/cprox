import "mocha"
import { expect } from "chai"
import {
    collectCheckType,
    Types,
    TypeCheckRes,
    TypeDef,
    TypeId
} from "../index"

export function checkTypeWrapper(
    value: any,
    type: TypeDef,
    res: TypeCheckRes,
): void {
    expect(
        JSON.stringify(
            collectCheckType(
                value,
                type
            ),
            null,
            2,
        )
    ).is.equals(
        JSON.stringify(
            res,
            null,
            2,
        )
    )
}

describe("Check port with 'checkType'", () => {
    it("Port check should be right", function () {
        const value: any = 43211
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: 43211
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be right", function () {
        const value: any = 0
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: 0
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be right", function () {
        const value: any = 65535
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: 65535
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = 65536
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "number value (65536) is bigger then maximum value (65535)"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = -1
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "number value (-1) is smaller then minimum value (0)"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = 100123123
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "number value (100123123) is bigger then maximum value (65535)"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = 42132.12314
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "number of decimal places must be a exact 0 and not 5"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = 65536.1
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "number value (65536.1) is bigger then maximum value (65535)"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = {
            test: "hallo"
        }
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "value(object) is not a number"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Port check should be wrong", function () {
        const value: any = "hallo"
        const type: TypeDef = Types.PORT_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "value(string) is not a number"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })
})

describe("Check string with 'checkType'", () => {
    it("String check should be right", function () {
        const value: any = "hello"
        const type: TypeDef = TypeId.STRING
        const res: TypeCheckRes = {
            err: false,
            value: "hello"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("String check should be right", function () {
        const value: any = "This is a test"
            .toLowerCase()
            .split(" ").join("-")
            .split("--").join("-")
        const type: TypeDef = TypeId.STRING
        const res: TypeCheckRes = {
            err: false,
            value: "this-is-a-test",
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("String check should be wrong", function () {
        const value: any = 9384719
        const type: TypeDef = TypeId.STRING
        const res: TypeCheckRes = {
            err: true,
            msg: "value(number) is not a string"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("String check should be wrong", function () {
        const value: any = {
            value: "hello"
        }
        const type: TypeDef = TypeId.STRING
        const res: TypeCheckRes = {
            err: true,
            msg: "value(object) is not a string"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })
})

describe("Check email with 'checkType'", () => {
    it("Email check should be right", function () {
        const value: any = "majo@coreunit.net"
        const type: TypeDef = Types.EMAIL_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: "majo@coreunit.net"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Email check should be right", function () {
        const value: any = "no.the.1frist.tester890@gmail.com"
        const type: TypeDef = Types.EMAIL_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: "no.the.1frist.tester890@gmail.com"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Email check should be right", function () {
        const value: any = "no.the.1frist.tester890@gmail.com"
        const type: TypeDef = Types.EMAIL_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: "no.the.1frist.tester890@gmail.com"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })
})

describe("Check domain with 'checkType'", () => {
    it("Domain check should be right", function () {
        const value: any = "coreunit.net"
        const type: TypeDef = Types.DOMAIN_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: "coreunit.net"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Domain check should be right", function () {
        const value: any = "api.github.com"
        const type: TypeDef = Types.DOMAIN_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: "api.github.com"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Domain check should be right", function () {
        const value: any = "my.very.long.subdomain.domain.for.tests.domainsss"
        const type: TypeDef = Types.DOMAIN_TYPE
        const res: TypeCheckRes = {
            err: false,
            value: "my.very.long.subdomain.domain.for.tests.domainsss"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Domain check should be wrong", function () {
        const value: any = "nono..com"
        const type: TypeDef = Types.DOMAIN_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "string value does not match the regular expression: '^(?!-)[A-Za-z0-9-]+([\\\\-\\\\.]{1}[a-z0-9]+)*\\\\.[A-Za-z]{2,6}$'"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Domain check should be wrong", function () {
        const value: any = ".domain.doma"
        const type: TypeDef = Types.DOMAIN_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "string value does not match the regular expression: '^(?!-)[A-Za-z0-9-]+([\\\\-\\\\.]{1}[a-z0-9]+)*\\\\.[A-Za-z]{2,6}$'"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })

    it("Domain check should be wrong", function () {
        const value: any = "nono.hellllluuu.com."
        const type: TypeDef = Types.DOMAIN_TYPE
        const res: TypeCheckRes = {
            err: true,
            msg: "string value does not match the regular expression: '^(?!-)[A-Za-z0-9-]+([\\\\-\\\\.]{1}[a-z0-9]+)*\\\\.[A-Za-z]{2,6}$'"
        }
        checkTypeWrapper(
            value,
            type,
            res,
        )
    })
})
