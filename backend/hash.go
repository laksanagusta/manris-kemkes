//go:build ignore

package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "admin123"
	hash := "$2a$10$CK3ePZRtLOZL5yIE9j.0veUiAcsFukGDqd2jPLzeop7oQ3Kgwe8Hy"
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		fmt.Println("Does not match!", err)
	} else {
		fmt.Println("Matches!")
	}
}
