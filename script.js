const name = "Mohanraj";
let visits = 1;
console.log("Welcome to " + name + "'s portfolio");
function greet(person)
{
    return "Hello, " + person + "!";
}
console.log(greet("Recruiter"));
function add(a,b)
{
    return a + b;
}
console.log(add(5, 3))
function square(n)
{
    return n * n;
}
console.log(square(3))
const skills = ["Python", "HTML", "CSS"]
console.log(skills.length)
const subtitle = document.querySelector(".hero h3");
subtitle.textContent = "Full Stack Developer | Python | Django";
const toggle = document.querySelector("#theme-toggle");

toggle.addEventListener("click", function () {
    document.body.classList.toggle("light");

    if (document.body.classList.contains("light")) {
        toggle.textContent = "Dark";
    } else {
        toggle.textContent = "Light";
    }
});