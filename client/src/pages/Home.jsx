import AiTooles from "../components/AiTooles";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Navbar from "../components/Navbar";
import Plan from "../components/Plan";
import Testimonial from "../components/Testimonials";

const Home = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <AiTooles />
      <Testimonial />
      <Plan />
      <Footer />
    </>
  );
};

export default Home;
